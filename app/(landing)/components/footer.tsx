'use client'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function Footer() {

  const navigation = {
    products: [
      { name: 'Personal Trading Journal', href: '#' },
      { name: 'Self-Hosted Analytics', href: '#' },
    ],
    resources: [
      { name: 'About', href: '#' },
    ],
    social: [
      { name: 'YouTube', href: '#', icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
        </svg>
      )},
      { name: 'Discord', href: '#', icon: (props: React.SVGProps<SVGSVGElement>) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      )},
    ],
  }

  return (
    <footer aria-labelledby="footer-heading" className="py-16 transition-colors duration-300 max-w-7xl mx-auto">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="container mx-auto px-4">
        {/* Main Footer Content - 3 Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Column 1: Brand & Socials */}
          <div className="space-y-6">
            <div className="flex items-center">
              <Logo className="h-8 w-8 mr-3 fill-foreground transition-colors" />
              <h3 className="text-xl font-bold text-foreground">Deltalytix</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Advanced analytics for modern traders.
            </p>
            <div className="flex space-x-4">
              {navigation.social.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-110 transform"
                  aria-label={item.name}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Products */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">
              Products
            </h4>
            <ul role="list" className="space-y-3">
              {navigation.products.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 leading-relaxed"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground">
              Resources
            </h4>
            <ul role="list" className="space-y-3">
              {navigation.resources.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 leading-relaxed"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright and Disclaimers */}
        <div className="mt-12 pt-8 border-t border-border">
          {/* Copyright */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              © 2025 Deltalytix. All rights reserved.
            </p>
          </div>

          {/* Disclaimers - Improved Readability */}
          <div className="text-center max-w-4xl mx-auto space-y-3">
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              <strong>Risk Disclaimer:</strong> Trading futures and forex is risky and not for everyone.
              You can lose part or all of your money. Only trade with money you can afford to lose.
              Past results don&apos;t guarantee future outcomes.
            </p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              <strong>Hypothetical Performance:</strong> Hypothetical results are based on hindsight,
              not real risk, and often differ from actual trading. Real trading involves losses,
              discipline, and market factors that can&apos;t be fully shown in simulations.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}