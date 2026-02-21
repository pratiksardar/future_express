import { SkyboxViewer } from "@/components/SkyboxViewer";
import Link from "next/link";

export default function OfficeHQPage() {
    // The Skybox URL we generated via Blockade Labs
    const officeUrl = "https://images.blockadelabs.com/images/imagine/Advanced_no_style_equirectangular-jpg_A_1930s_vintage_newsroom_8724464362_14998007.jpg?ver=1";

    return (
        <div className="flex flex-col h-screen bg-[#1a1a1a] text-white">
            <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50 z-10 absolute top-0 w-full">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-gray-400 hover:text-white font-mono text-sm uppercase">
                        ← Return to Press Room
                    </Link>
                    <h1 className="text-xl font-bold font-serif tracking-widest text-[#E5D7B3]">
                        Future Express HQ
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-xs font-mono text-cyan-400 border border-cyan-800 bg-cyan-900/20 px-2 py-1 rounded">
                        Persistent Spatial Context Active (Blockade Labs API)
                    </div>
                </div>
            </header>

            <div className="flex-1 relative">
                {/* 360 Viewer */}
                <SkyboxViewer url={officeUrl} />

                {/* Overlay Context */}
                <div className="absolute bottom-10 left-10 max-w-sm pointer-events-none">
                    <div className="bg-black/70 border border-gray-600 p-4 rounded backdrop-blur-sm pointer-events-auto">
                        <h2 className="text-xl font-bold font-serif text-[#E5D7B3] mb-2">The Editor's Desk</h2>
                        <p className="font-mono text-sm text-gray-300 leading-relaxed">
                            Welcome to the physical instantiation of the Autonomous Editor Agent.
                            <br /><br />
                            This 360° environment serves as the spatial memory core, where the agent oversees global prediction market fluctuations before committing them to the blockchain layout.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
