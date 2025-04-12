# JobHound Onboarding Flow Implementation

This directory contains the implementation of the JobHound onboarding flow, which allows users to try the application's core functionality before creating an account.

## Components

1. **OnboardingFlowSection.tsx**: Client component that wraps the OnboardingFlow and provides a container with introduction text and a button to start the flow.

2. **OnboardingFlow.tsx**: The main multi-step form component that guides users through the onboarding process:
   - Step 1: Job information entry (creates anonymous user and saves job)
   - Step 2: Resume upload (uploads resume file and saves resume record)
   - Step 3: Account creation (registers user and creates scan)

## How It Works

The onboarding flow uses anonymous users to allow potential customers to try the core functionality:

1. When the flow starts, an anonymous user is created with 10 credits (same as regular users)
2. As users progress through the flow, their job and resume data is saved under this anonymous user
3. When they create an account in the final step, this anonymous user is converted to a permanent account
4. During account conversion, a scan is automatically created using 1 credit
5. The user is redirected to the job details page to view their scan results

The key aspect is that the user's data is preserved throughout the process, and the scan creation serves as an incentive to complete the signup.

## Database Functions

The implementation relies on two key SQL functions:

### create_anonymous_user()

- Creates a new record in the users table with is_anonymous=true
- Grants 10 credits to this anonymous user (same as regular users)
- Sets expiration to 24 hours from creation

### convert_anonymous_user()

- Updates the anonymous user with the provided email and name
- Removes the anonymous flag
- Finds the job and resume created during onboarding
- Consumes 1 credit to create a scan
- Returns the job ID to redirect the user to view their scan

## TypeScript Implementation

The OnboardingFlow component handles:

- Creating an anonymous user on component mount
- Saving job details in step 1
- Uploading and saving resume in step 2
- Creating an account and running the conversion in step 3
- Error handling and validation throughout

## Cleanup

Anonymous users and their data are automatically cleaned up if:

1. They successfully convert to a permanent account (data is preserved)
2. Their anonymous_expires_at date passes (data is deleted via database cleanup function)

## Future Improvements

- Add support for multiple anonymous job uploads
- Implement a "save for later" feature with email reminders
- Add a preview of scan results before account creation
- Improve error recovery if uploads fail

## Relationship to Existing Scan Creation Flow

This onboarding flow shares similarities with the existing `/dashboard/scans/new` flow but with key differences:

### Similarities:
- Multi-step form UI pattern
- Job information collection
- Resume upload functionality
- Scan generation concept

### Differences:
- Onboarding flow requires creating new job/resume (can't select existing ones)
- Onboarding flow includes account creation as a required step before scan generation
- Onboarding flow uses anonymous authentication behind the scenes
- Simplified UI optimized for first-time users

## Implementation Notes

In a full implementation:

1. Anonymous user authentication would be handled per the app_flow.md document:
   ```typescript
   // When user starts onboarding
   const { data } = await supabase.auth.signUp({
     email: `anonymous-${Date.now()}@jobhound.example.com`,
     password: crypto.randomUUID(),
     options: { data: { is_anonymous: true } }
   });
   
   await supabase.rpc('create_anonymous_user');
   ```

2. Job and resume data would be stored under this anonymous user

3. When the user creates a permanent account, the data would be transferred:
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

4. After successful account creation, the scan would be generated and the user redirected:
   ```typescript
   // Create the scan using the job and resume created during onboarding
   const result = await createScan({
     jobId,
     resumeId
   });
   
   // Redirect to the job details page showing the scan results
   router.push(`/dashboard/jobs/${jobId}`);
   ```

The current implementation is a UI prototype that demonstrates the flow without the backend authentication logic. 