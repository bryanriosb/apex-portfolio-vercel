import { Crosshair } from "lucide-react";

export default function IsoType() {
    return (
        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#0052FF] flex items-center justify-center shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] border-2 border-gray-900">
            <Crosshair className="text-white w-3 h-3 sm:w-5 sm:h-5" />
        </div>
    )
}