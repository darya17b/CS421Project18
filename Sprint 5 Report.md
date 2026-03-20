# Sprint 5 Report (Feb 17th to March 15th)

## YouTube link of Sprint * Video (Make this video unlisted)
https://youtu.be/Cqh9iexMq4U
## What's New (User Facing)
 * Improved readability and navigation throughout the application based on client feedback.
 * Implemented additional UI refinements and accessibility-focused cosmetic changes.
 * Continued progress on authentication support, including backend work for Okta/oAuth and JWT integration.
 * Fixed bugs and improved overall application stability.
 * Continued frontend updates to better align with backend functionality.

## Work Summary (Developer Facing)
During this sprint, our frontend focused on improving the usability of the Standardized Patient File Management System. On the backend, we worked with WSU IT on an Okta authentication system and made substantial progress toward implementing oAuth and JWT support. Most of the backend work is now in place, but we are currently waiting on a proper callback URL from IT before authentication can be fully completed and tested. On the frontend, we addressed a large amount of client feedback by improving readability, navigation, and general UI polish, while also fixing bugs and continuing alignment with backend progress. This sprint also helped us better understand the coordination required for external authentication integration and reinforced the importance of iterative refinement through user feedback.

## Unfinished Work
We did not fully complete authentication during this sprint. Although we accomplished most of the Okta authentication backend implementation with WSU IT, we were not given a proper callback URL, so we are currently waiting on that before we can finish and fully test the login flow. Frontend authentication work is still in progress. We also still want to reach 100% of our intended functionality and continue bug fixing in the next sprint. 

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:

 * Client Feedback Implementation 1
 * Backend JWT and oAuth Integration
 * Medical Card Upload

 
 ## Incomplete Issues/User Stories
 Here are links to issues we worked on but did not complete in this sprint:
 
 * In-line editing
 * Frontend oAuth Implemntation
 * Frontend Version History and Script Cloning Implementation
 * Client Feedback Implementation 2
 


## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
* https://github.com/darya17b/CS421Project18/blob/main/Docker/Dockerfile
* https://github.com/darya17b/CS421Project18/blob/main/code/backend/VCCwebsite/go.mod
* https://github.com/darya17b/CS421Project18/blob/main/code/backend/VCCwebsite/go.sum
* https://github.com/darya17b/CS421Project18/blob/main/code/backend/VCCwebsite/cmd/service/actor.db
* https://github.com/darya17b/CS421Project18/blob/main/code/backend/VCCwebsite/cmd/service/main.go
* https://github.com/darya17b/CS421Project18/tree/main/code/backend/VCCwebsite/internal/model
* https://github.com/darya17b/CS421Project18/tree/main/code/backend/VCCwebsite/internal/oAuth
* https://github.com/darya17b/CS421Project18/tree/main/code/backend/VCCwebsite/internal/db
* https://github.com/darya17b/CS421Project18/blob/main/code/Frontend/src/api/client.js
* https://github.com/darya17b/CS421Project18/blob/main/code/Frontend/src/pages/FormsSearch.jsx
* https://github.com/darya17b/CS421Project18/blob/main/code/Frontend/src/pages/Requests.jsx
 
## Retrospective Summary
Here's what went well:
  * We made strong progress on backend authentication and Okta integration.
  * We responded well and made big leaps with client feedback by improving readability, navigation, and overall UI quality.
  * We continued improving deployment, backend/frontend interaction, and general bug fixing.
 
Here's what we'd like to improve:
   * We never got to meet with our client due to a scheduled break. Couldn't get in touch with IT until earlier this week due to scheduling conflicts.
   * We want to improve our ability to fully test authentication-related features earlier.
   * We want to continue refining unfinished functionality and resolving remaining bugs.
  
Here are changes we plan to implement in the next sprint:
   * Finish the authentication process once the callback URL is provided and complete frontend integration.
   * Continue bug fixes until the system reaches full intended functionality.
   * Keep refining the UI and user-role-related frontend features based on feedback and backend progress. 