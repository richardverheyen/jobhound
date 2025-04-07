'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import BuyCreditsButton from '@/app/components/BuyCreditsButton';

// Credit package options
const CREDIT_PACKAGES = [
  { id: '10-credits', name: '10 Credits', price: '$2.00', credits: 10, description: 'Basic package for occasional use' },
  { id: '30-credits', name: '30 Credits', price: '$5.00', credits: 30, description: 'Best value for regular job hunting', popular: true }
];

// Component to handle search params within a suspense boundary
function CheckoutStatus({ onStatusChange }: { onStatusChange: (status: 'idle' | 'success' | 'canceled') => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');
    
    if (sessionId) {
      onStatusChange('success');
    } else if (canceled) {
      onStatusChange('canceled');
    } else {
      onStatusChange('idle');
    }
  }, [searchParams, onStatusChange]);
  
  return null;
}

export default function BuyCreditsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>(CREDIT_PACKAGES[1].id); // Default to the best value package
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'canceled'>('idle');
  
  // Fetch the current user
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      // Get complete user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user profile:', userError);
      } else {
        // Merge user auth data with profile data
        setUser({
          ...user,
          ...userData
        });
      }
      
      setLoading(false);
    }
    
    loadUser();
  }, [router]);
  
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };
  
  // Get the appropriate status message if there's a checkout status
  const getStatusMessage = () => {
    if (checkoutStatus === 'success') {
      return (
        <div className="mb-8 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Payment successful</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>Your credits have been added to your account. You can now use them to scan job listings.</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                    onClick={() => router.push('/dashboard')}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (checkoutStatus === 'canceled') {
      return (
        <div className="mb-8 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Payment canceled</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>Your payment was canceled. No credits have been added to your account.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      
      {/* Suspense boundary for useSearchParams */}
      <Suspense fallback={null}>
        <CheckoutStatus onStatusChange={setCheckoutStatus} />
      </Suspense>
      
      <main className="flex-grow px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Purchase Credits
          </h1>
          
          {getStatusMessage()}
          
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Choose a Credit Package
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Credits are used to analyze your resume against job listings. Each scan uses 1 credit.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {CREDIT_PACKAGES.map((pkg) => (
                  <div 
                    key={pkg.id}
                    className={`border rounded-lg p-6 cursor-pointer transition hover:shadow-md relative
                      ${selectedPackage === pkg.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }
                    `}
                    onClick={() => handlePackageSelect(pkg.id)}
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl rounded-tr">
                        Best Value
                      </div>
                    )}
                    
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {pkg.name}
                    </h3>
                    
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {pkg.price}
                    </p>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {pkg.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {pkg.credits} Credits
                      </span>
                      
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center
                        ${selectedPackage === pkg.id ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {selectedPackage === pkg.id && (
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <BuyCreditsButton 
                  userId={user?.id}
                  variant="default"
                  size="large"
                  className="w-full sm:w-auto px-8"
                  returnUrl="/dashboard/credits/buy"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Important Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Credits expire after 365 days from the purchase date.</li>
                  <li>Payments are processed securely through Stripe.</li>
                  <li>We don't store your payment details.</li>
                  <li>For issues with your purchase, please contact support.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 