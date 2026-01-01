import type { Metadata } from "next";
import { inter } from "@/lib/fonts";
import "./globals.css";
import { SafeToaster } from "@/components/safe-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Removed Vercel Analytics and Speed Insights to comply with essential-only cookie policy
import { AuthProvider } from "@/context/auth-provider";
import { ConsentBanner } from "@/components/consent-banner";
import { ConsoleFilterWrapper } from "@/components/console-filter-wrapper";
import { ThemeProvider } from "@/context/theme-provider";
import { DeploymentMonitor } from "@/components/deployment-monitor";
import { ErrorBoundaryWrapper } from "@/components/error-boundary";
import { SeasonalManager } from "@/app/dashboard/components/seasonal/seasonal-manager";
import Script from "next/script"

// Font configuration now imported from lib/fonts.ts

// Simplified metadata for personal app (no SEO needed)
export const metadata: Metadata = {
  title: "Deltalytix",
  description: "Personal trading analytics dashboard",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} translate="no" suppressHydrationWarning>
      <head>
        {/* Prevent Google Translate */}
        <meta name="google" content="notranslate" />
        <meta name="googlebot" content="notranslate" />
        <meta name="googlebot-news" content="notranslate" />

        {/* Prevent theme flash - improved version */}
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                var effectiveTheme = theme === 'system' || !theme ? systemTheme : theme;
                
                if (effectiveTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {
                // Fallback to system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.style.colorScheme = 'light';
                }
              }
            })();
          `}
        </Script>

        {/* DOM patches for third-party widget compatibility */}
        <Script id="dom-patches" strategy="beforeInteractive">
          {`
            (function() {
              if (typeof Node === 'function' && Node.prototype) {
                var originalRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  try {
                    if (child.parentNode !== this) {
                      return child;
                    }
                    return originalRemoveChild.call(this, child);
                  } catch (error) {
                    return child;
                  }
                };
              }
            })();
          `}
        </Script>

        {/* Prevent Google Translate DOM manipulation */}
        <Script id="prevent-google-translate" strategy="beforeInteractive">
          {`
            // Function to prevent Google Translate from modifying the DOM
            function preventGoogleTranslate() {
              // Prevent Google Translate from modifying the DOM
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'childList' && 
                      mutation.target.classList && 
                      mutation.target.classList.contains('goog-te-menu-frame')) {
                    // Prevent Google Translate from modifying our React components
                    const elements = document.querySelectorAll('[class*="goog-te-"]');
                    elements.forEach((el) => {
                      if (el.tagName === 'SPAN' && el.parentElement) {
                        // Preserve the original text content
                        const originalText = el.getAttribute('data-original-text') || el.textContent;
                        el.textContent = originalText;
                      }
                    });
                  }
                });
              });

              // Start observing the document with the configured parameters
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
              });

              // Prevent Google Translate from initializing
              if (window.google && window.google.translate) {
                window.google.translate.TranslateElement = function() {
                  return {
                    translate: function() {
                      return false;
                    }
                  };
                };
              }
            }

            // Run the prevention function
            preventGoogleTranslate();
          `}
        </Script>


        {/* Analytics removed to comply with essential-only cookie policy */}

        {/* Preload Inter font with fallback handling */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Performance: Preconnect to Supabase for faster API calls */}
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
          crossOrigin="anonymous"
        />

        {/* Performance: DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="180x180"
          href="/apple-touch-icon-precomposed.png"
        />
        <style>
          {`
            /* Font fallback for when Google Fonts fails */
            @font-face {
              font-family: 'Inter Fallback';
              src: local('Inter'), local('-apple-system'), local('BlinkMacSystemFont'), local('Segoe UI'), local('Roboto');
              font-display: swap;
            }
            
            /* Ensure font variables are available */
            :root {
              --font-inter: 'Inter', 'Inter Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            }

            /* Base layout */
            html {
              margin: 0;
              padding: 0;
              overflow-y: scroll !important;
              overflow-x: hidden !important;
              scrollbar-gutter: stable !important;
              -ms-overflow-style: scrollbar !important;
            }

            body {
              min-height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: hidden !important;
            }

            /* Style the scrollbar */
            ::-webkit-scrollbar {
              width: 14px !important;
              background-color: transparent !important;
            }

            ::-webkit-scrollbar-track {
              background: hsl(var(--background)) !important;
              border-left: 1px solid hsl(var(--border)) !important;
            }

            ::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3) !important;
              border-radius: 7px !important;
              border: 3px solid hsl(var(--background)) !important;
              min-height: 40px !important;
            }

            ::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.4) !important;
            }

            /* Firefox scrollbar styles */
            * {
              scrollbar-width: thin !important;
              scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
            }
          `}
        </style>

      </head>
      <body className={`${inter.variable} font-sans min-h-screen overflow-x-hidden w-full`}>
        <ErrorBoundaryWrapper showDetails={process.env.NODE_ENV === 'development'}>
          <ThemeProvider>
            <ConsoleFilterWrapper>
              <AuthProvider>
                <TooltipProvider>
                  <DeploymentMonitor />
                  <ConsentBanner />
                  <SafeToaster />
                  <SeasonalManager />
                  {children}
                </TooltipProvider>
              </AuthProvider>
            </ConsoleFilterWrapper>
          </ThemeProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}