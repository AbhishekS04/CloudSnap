import Link from "next/link";

export default function NotFound() {
	return (
		<div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white z-[99999]">
			<div className="text-center">
				<h1 className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter opacity-20">
					404
				</h1>
				<div className="mt-8 space-y-4">
					<p className="text-zinc-500 uppercase tracking-[0.3em] text-xs font-light">
						Lost in the void
					</p>
					<div className="flex items-center justify-center gap-8 pt-8">
						<Link 
							href="/" 
							className="text-zinc-400 hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"
						>
							Return
						</Link>
						<Link 
							href="/gallery" 
							className="text-zinc-400 hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"
						>
							Explore
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
