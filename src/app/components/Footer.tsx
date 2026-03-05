import { Sparkles, Linkedin, Twitter, Facebook, Mail } from "lucide-react";

const footerLinks = {
  product: [
    { name: "Fonctionnalités", href: "#features" },
    { name: "Agents IA", href: "#agents" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Marketplace", href: "#" },
    { name: "API", href: "#" }
  ],
  company: [
    { name: "À propos", href: "#about" },
    { name: "Blog", href: "#" },
    { name: "Carrières", href: "#" },
    { name: "Contact", href: "#" },
    { name: "Partenaires", href: "#" }
  ],
  resources: [
    { name: "Documentation", href: "#" },
    { name: "Guides", href: "#" },
    { name: "Support", href: "#" },
    { name: "Statut", href: "#" },
    { name: "Communauté", href: "#" }
  ],
  legal: [
    { name: "Confidentialité", href: "#" },
    { name: "Conditions", href: "#" },
    { name: "Sécurité", href: "#" },
    { name: "Cookies", href: "#" }
  ]
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">MAGIA</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-sm">
              La plateforme AI Workforce qui permet aux PME africaines de déployer et orchestrer des agents IA spécialisés en 24h.
            </p>
            <div className="flex gap-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produit</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Ressources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Légal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2026 MAGIA - Madagascar. Par Andreas LOVATIANA
            </p>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">CGU</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
              <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
