export interface TensorMeta { name:string; shape:number[] }
export interface ModelMeta { board:number; k:number; planes:number; ch:number; blocks:number; iter:number; tensors:TensorMeta[]; total_floats:number }
export interface NetworkOutput { policy:Float32Array; value:number }

const relu=(a:Float32Array)=>{for(let i=0;i<a.length;i++)if(a[i]<0)a[i]=0;return a};
function conv3(src:Float32Array,cin:number,cout:number,w:Float32Array,b:Float32Array,n:number){
  const hw=n*n,out=new Float32Array(cout*hw);
  for(let oc=0;oc<cout;oc++){
    const ob=oc*hw;out.fill(b[oc],ob,ob+hw);
    for(let ic=0;ic<cin;ic++){
      const ib=ic*hw,wb=(oc*cin+ic)*9;
      for(let kr=0;kr<3;kr++){
        const dr=kr-1,r0=dr<0?1:0,r1=dr>0?n-1:n;
        for(let kc=0;kc<3;kc++){
          const k=w[wb+kr*3+kc];if(k===0)continue;
          const dc=kc-1,c0=dc<0?1:0,c1=dc>0?n-1:n;
          for(let r=r0;r<r1;r++){
            const orow=ob+r*n,srow=ib+(r+dr)*n+dc;
            for(let c=c0;c<c1;c++)out[orow+c]+=k*src[srow+c];
          }
        }
      }
    }
  }
  return out;
}
function conv1(src:Float32Array,cin:number,cout:number,w:Float32Array,b:Float32Array,n:number){
  const hw=n*n,out=new Float32Array(cout*hw);
  for(let oc=0;oc<cout;oc++){
    const ob=oc*hw;for(let i=0;i<hw;i++)out[ob+i]=b[oc];
    for(let ic=0;ic<cin;ic++){
      const k=w[oc*cin+ic];if(k===0)continue;const ib=ic*hw;
      for(let i=0;i<hw;i++)out[ob+i]+=k*src[ib+i];
    }
  }
  return out;
}

export class ReversixNet {
  readonly tensors:Record<string,Float32Array>={};
  constructor(readonly meta:ModelMeta,flat:Float32Array){
    let offset=0;
    for(const {name,shape} of meta.tensors){const length=shape.reduce((a,b)=>a*b,1);this.tensors[name]=flat.subarray(offset,offset+length);offset+=length}
    if(offset!==flat.length||flat.length!==meta.total_floats)throw new Error(`weight blob size mismatch: ${offset} vs ${flat.length}`);
  }
  static async load(base:string){
    const [metaResponse,weightsResponse]=await Promise.all([fetch(`${base}.json`),fetch(`${base}.bin`)]);
    if(!metaResponse.ok||!weightsResponse.ok)throw new Error("MODEL LOAD FAILED");
    const meta=await metaResponse.json() as ModelMeta,buffer=await weightsResponse.arrayBuffer();
    if(buffer.byteLength!==meta.total_floats*4)throw new Error("MODEL SIZE MISMATCH");
    return new ReversixNet(meta,new Float32Array(buffer));
  }
  forward(planes:Float32Array):NetworkOutput{
    const {ch,blocks,planes:p,board:n}=this.meta,hw=n*n,t=this.tensors;
    if(planes.length!==p*hw)throw new Error("INVALID MODEL INPUT");
    let h=relu(conv3(planes,p,ch,t["stem.w"],t["stem.b"],n));
    for(let i=0;i<blocks;i++){
      const y1=relu(conv3(h,ch,ch,t[`blk${i}.c1.w`],t[`blk${i}.c1.b`],n));
      const y2=conv3(y1,ch,ch,t[`blk${i}.c2.w`],t[`blk${i}.c2.b`],n);
      for(let j=0;j<y2.length;j++)y2[j]+=h[j];h=relu(y2);
    }
    const p0=relu(conv1(h,ch,32,t["ph0.w"],t["ph0.b"],n));
    const policy=conv1(p0,32,1,t["ph3.w"],t["ph3.b"],n);
    const v0=relu(conv1(h,ch,32,t["vh0.w"],t["vh0.b"],n)),pooled=new Float32Array(32);
    for(let c=0;c<32;c++){let sum=0;for(let i=0;i<hw;i++)sum+=v0[c*hw+i];pooled[c]=sum/hw}
    const hidden=new Float32Array(64);
    for(let o=0;o<64;o++){let sum=t["vf0.b"][o];for(let i=0;i<32;i++)sum+=t["vf0.w"][o*32+i]*pooled[i];hidden[o]=sum>0?sum:0}
    let value=t["vf2.b"][0];for(let i=0;i<64;i++)value+=t["vf2.w"][i]*hidden[i];
    return {policy,value:Math.tanh(value)};
  }
}
