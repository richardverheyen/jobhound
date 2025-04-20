import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="relative container mx-auto px-4 py-3">
          <div className="flex items-center">
            <Link href="/" className="flex items-end space-x-2">
              <Image
                src="/logo.png"
                alt="JobHound Logo"
                className="h-14 w-auto bottom-0 absolute"
              />
              <span className="text-xl pl-12 font-bold text-gray-900 dark:text-white">
                JobHound
              </span>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {children}
        </div>
      </main>
      
      <footer className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} JobHound. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 