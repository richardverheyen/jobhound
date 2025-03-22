### Introduction

**JobHound** is a dog-themed, web-based SaaS platform which gives job-seekers a centralised platform to track job listings from sites like Seek, Indeed and Linkedin, and compare their Resumes against those jobs before their formal application. JobHound uses LLMs to create a standardised Applicant Tracking Score which will compare an applicant's Resume to a Job listing based on metrics like keywords, qualifications, experience, soft-skills, hard-skills and others resulting in a final Match Score and summary for that particular job. The platform will also offer other features, like setting a goal of jobs to apply for in a given day, and a browser extension which makes it easy to pull job ad listings into the JobHound platform.

### Sign-In/Sign-Up

New users can access JobHound by either creating a new Supabase Auth user by either using an email/pwd combination or Google Third Party Auth. This can be achieved through the dedicated /sign-up route, or through the 'Onboarding Flow'. They will then be redirected to the /dashboard route where they can start creating Job, Resume and Scan records. New users automatically have credit_purchase record created for them, granting them 10 free credits. This is not linked to stripe in any way, all further credits must be created by the stripe checkout.

### The Onboarding Flow

The 'Onboarding Flow' lets visitors try the platform before creating a permanent account. This flow exists as a 3-step process:

1. **Anonymous Authentication (Background):**
   - When a user starts the onboarding process, the system automatically creates an anonymous Supabase Auth user
   - This happens invisibly to the user, with no login prompt
   - All data created during onboarding is associated with this anonymous user

2. **Job & Resume Entry:**
   - Step 1: The user inputs the text from a Job listing in a textarea
   - Step 2: The user uploads their resume file
   - Step 3: The system performs an initial scan analysis showing a preview of results
   
3. **Account Creation:**
   - The user is prompted to create a permanent account to save their data
   - When they complete sign-up, their anonymous account is converted to a permanent one
   - All previously created data remains accessible under their new account

The anonymous user has a limited lifetime (24 hours by default) and will be automatically cleaned up if the user abandons the onboarding process.

### Main Dashboard

Upon signing in successfully, users are welcomed to the main dashboard, featuring a grid-style display of 
their Job records on the left, their 'Default' Resume record on the right, and a short list of their User's Credit_Usage history lower down on the right. At the top of the Dashboard there will be a prompt to add the 'JobHound browser extension (coming soon)', there will also be a primary CTA to 'Generate a Scan' which navigates the user to the /dashboard/jobs/new route. Each row of the Job list will show a summary of Scans done against it, with the Scan's Match Score displayed as well. Clicking on a Job from the list will navigate you to that Job's individual Job page. You can also navigate to the /dashboard/jobs and /dashboard/resumes pages from their grid section in the dashboard. Finally on the right side there is a "Set Job Search Goal" section where a user can set a target to find a certain number of jobs for that day. The layout is clean and minimalistic, utilizing neutral colors and easy-to-read fonts that make navigation straightforward and interactions intuitive.

### Detailed Feature Flows and Page Transitions

1. The /dashboard/jobs page shows users the list of their own Job records they have uploaded, with filtering and sorting options. It also has a prompt for the 'JobHound browser extension (coming soon)', and the "Set Job Search Goal" functionality which prompts them to find 10 good job listings today.
   1.1. The /dashboard/jobs/new page is the default
   1.2. The /dashboard/jobs/:id page shows an individual Job listing summarised on the right, with the core JobHound Scan functionality on the left, as Scans are always linked to a specific Job. Users should be able to look back at multiple past Scans (summarised with their date and match score) on a specific Job, and expand each one to view the different score categories as well as which Resume record was used to perform the Scan. 

2. The /dashboard/resumes page shows users cards that represent each Resume record they have uploaded to supabase. It's primary goal is to help users upload new versions of their resume, and select which of their displayed resumes should be stored against their User record as their 'default' resume, which is the one displayed on the /dashboard page, and the first one shown in the list of Resumes when a user initiates a new Scan on a Job record.

### Technical Implementation Details

#### Authentication Flow

1. **Anonymous User Creation:**
   ```typescript
   // When user starts onboarding
   const { data } = await supabase.auth.signUp({
     email: `anonymous-${Date.now()}@jobhound.example.com`,
     password: crypto.randomUUID(),
     options: { data: { is_anonymous: true } }
   });
   
   await supabase.rpc('create_anonymous_user');
   ```

2. **Conversion to Permanent User:**
   ```typescript
   // When user completes sign-up
   const { data } = await supabase.auth.updateUser({
     email: userProvidedEmail,
     password: userProvidedPassword
   });
   
   await supabase.rpc('convert_anonymous_user', {
     p_user_id: data.user.id,
     p_email: userProvidedEmail
   });
   ```

3. **Cleanup Process:**
   A scheduled function runs daily to remove expired anonymous users:
   ```typescript
   await supabase.rpc('cleanup_expired_anonymous_users');
   ```

All database operations use Supabase's Row Level Security to ensure users can only access their own data, whether they're anonymous or permanent users.