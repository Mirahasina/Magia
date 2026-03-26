export function JournauxAuditView() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold font-mono">system.log</h2>
            <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-hidden border border-gray-800 shadow-2xl">
                <div className="flex gap-4 text-gray-500 border-b border-gray-800 pb-4 mb-4">
                    <span>TIMESTAMP</span>
                    <span>ACTION</span>
                    <span>USER</span>
                </div>
                <div className="space-y-2">
                    <div className="flex gap-4">
                        <span className="text-blue-400">11:04:22</span>
                        <span className="text-green-400">AGENT_DEPLOYED</span>
                        <span className="text-gray-300">jean@magia.com</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-blue-400">10:52:10</span>
                        <span className="text-yellow-400">DOC_INDEXED</span>
                        <span className="text-gray-300">system_worker</span>
                    </div>
                    <div className="flex gap-4">
                        <span className="text-blue-400">09:15:45</span>
                        <span className="text-blue-800">LOGIN_SUCCESS</span>
                        <span className="text-gray-300">sarah@magia.com</span>
                    </div>
                    <div className="flex gap-4 text-gray-600 italic">
                        <span>[...] system operational</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
