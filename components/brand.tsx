import Link from 'next/link';
export function BrandLogo({vertical=false,ivory=true}:{vertical?:boolean;ivory?:boolean}) {
  return <Link href="/" aria-label="L’Amour — Inicio" className={`brand-lockup ${vertical?'brand-lockup-vertical':''} ${ivory?'brand-ivory':''}`}>
    <Isotipo ivory={ivory} className="brand-emblem"/>
    <span className="brand-copy" aria-hidden="true"><span className="brand-wordmark">L’Amour</span><span className="brand-subtitle">Intimate boutique</span></span>
  </Link>;
}
export function Isotipo({ivory=true,className=''}:{ivory?:boolean;className?:string}){return <img className={className} src={`/brand/${ivory?'symbol-ivory':'symbol'}.webp`} alt="" width="200" height="200"/>}
