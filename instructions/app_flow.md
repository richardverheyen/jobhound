### Introduction

**JobHound** is a dog-themed, web-based SaaS platform which gives job-seekers a centralised platform to track job listings from sites like Seek, Indeed and Linkedin, and compare their Resumes against those jobs before their formal application. JobHound uses LLMs to create a standardised Applicant Tracking Score which will compare an applicant's Resume to a Job listing based on metrics like keywords, qualifications, experience, soft-skills, hard-skills and others resulting in a final Match Score and summary for that particular job. The platform will also offer other features, like setting a goal of jobs to apply for in a given day, and a browser extension which makes it easy to pull job ad listings into the JobHound platform.

### Sign-In/Sign-Up

New users can access JobHound by either creating a new Supabase Auth user by either using an email/pwd combination or Google Third Party Auth. This can be achieved through the dedicated /sign-up route, or through the 'Onboarding Flow'. They will then be redirected to the /dashboard route where they can start creating Job, Resume and Scan records.

### The Onboarding Flow
The alternate 'Onboarding Flow' lets unauthenticated visitors to the site create 1 Job record and 1 Resume record first, without yet creating a User. This flow exists as a 3 step 'Form' where Step 1 is displayed by default and prompts the User to input the text from a Job listing in a textarea input, which is followed by a file input in step 2, and the third step automatically redirects the new user to the sign-up page, which they must complete before being able to view the Scan record that links their Job and Resume records. 

### Main Dashboard

Upon signing in successfully, users are welcomed to the main dashboard, featuring a grid-style display of 
their Job records on the left, their 'Default' Resume record on the right, and a short list of their User's Credit_Usage history lower down on the right. At the top of the Dashboard there will be a prompt to add the 'JobHound browser extension (coming soon)', there will also be a primary CTA to 'Gnerate a Scan' which navigates the user to the /dashboard/jobs/new route. Each row of the Job list will show a summary of Scans done against it, with the Scan's Match Score displayed as well. Clicking on a Job from the list will navigate you to that Job's individual Job page. You can also navigate to the /dashboard/jobs and /dashboard/resumes pages from their grid section in the dashboard. Finally on the right side there is a "Set Job Search Goal" section where a user can set a target to find a certain number of jobs for that day. The layout is clean and minimalistic, utilizing neutral colors and easy-to-read fonts that make navigation straightforward and interactions intuitive.

### Detailed Feature Flows and Page Transitions

1. The /dashboard/jobs page shows users the list of their own Job records they have uploaded, with filtering and sorting options. It also has a prompt for the 'JobHound browser extension (coming soon)', and the "Set Job Search Goal" functionality which prompts them to find 10 good job listings today.
1.1. The /dashboard/jobs/new page is the default
1.2. The /dashboard/jobs/:id page shows an individual Job listing summarised on the right, with the core JobHound Scan functionality on the left, as Scans are always linked to a specific Job. Users should be able to look back at multiple past Scans (summarised with their date and match score) on a specific Job, and expand each one to view the different score categories as well as which Resume record was used to perform the Scan. 

2. The /dashboard/resumes page shows users cards that represent each Resume record they have uploaded to supabase. It's primary goal is to help users upload new versions of their resume, and select which of their displayed resumes should be stored against their User record as their 'default' resume, which is the one displayed on the /dashboard page, and the first one shown in the list of Resumes when a user initiates a new Scan on a Job record. 

