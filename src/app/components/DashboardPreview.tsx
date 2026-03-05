import { Activity, MessageSquare, Users, TrendingUp } from "lucide-react";

export function DashboardPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto">
          {/* Browser Chrome */}
          <div className="bg-white rounded-t-2xl p-3 border border-gray-200 border-b-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 bg-gray-100 rounded px-4 py-1 text-center">
                <span className="text-sm text-gray-500">app.magia.ai • Dashboard</span>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-b-2xl border border-gray-200 border-t-0 p-8 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Automatisation Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">AUTOMATISATION</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">87%</div>
                <div className="text-sm text-green-400">↑ +3% ce mois</div>
              </div>

              {/* Conversations Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">CONVERSATIONS</span>
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">2 341</div>
                <div className="text-sm text-gray-400">↑ +12% cette semaine</div>
              </div>

              {/* Satisfaction Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">SATISFACTION</span>
                  <Users className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">5/5</div>
                <div className="text-sm text-gray-400">↑ Score moyen</div>
              </div>
            </div>

            {/* Active Agents Section */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Équipe IA — ACTIFS (3)</h3>
              <div className="space-y-3">
                <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold">
                      P
                    </div>
                    <div>
                      <div className="text-white font-medium">ProspectMax Sales</div>
                      <div className="text-sm text-gray-400">Qualification de leads entrants</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                    Actif
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                      H
                    </div>
                    <div>
                      <div className="text-white font-medium">Hasina Excel</div>
                      <div className="text-sm text-gray-400">Gestion comptable — Factures Mepco</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                    Occupé
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
                      C
                    </div>
                    <div>
                      <div className="text-white font-medium">Client Pro</div>
                      <div className="text-sm text-gray-400">Support client</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                    Actif
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-16 text-center">
            <div className="inline-block px-4 py-2 bg-blue-50 rounded-full mb-4">
              <span className="text-sm text-blue-600 font-medium">COMMENT ÇA MARCHE</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Opérationnel en moins de 10 minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pas de code. Pas de formation longue. Vos agents IA travaillent dès le premier jour.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
