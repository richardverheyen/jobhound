import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              JobHound
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Pricing
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/auth/login" className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              Login
            </Link>
            <Link href="/auth/signup" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              Find Your Perfect Job Match with JobHound
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              Track job listings, analyze your resume against job requirements, and boost your application success with our AI-powered tools.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth/signup" 
                className="px-8 py-3 text-lg font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Get Started
              </Link>
              <Link href="/features"
                className="px-8 py-3 text-lg font-medium rounded-md bg-white text-blue-600 hover:bg-gray-50 transition-colors border border-blue-600">
                Learn More
              </Link>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center text-gray-900 dark:text-white">
              How JobHound Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Track Job Listings</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Save job listings from various sites like Seek, Indeed, and LinkedIn in one central location.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-600 font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Upload Your Resume</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload your resume and let our AI analyze its strengths and weaknesses.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-600 font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Get Match Scores</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Receive detailed match scores and suggestions to improve your applications for specific jobs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} JobHound. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Terms
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 