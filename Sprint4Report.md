# Sprint 4 Report 01/12 to 02/17

(https://youtu.be/unOS4VFygaE)

## What's New (User Facing)
 * Door note generation
 * Resource upload
 * Collapsable script generation

## Work Summary (Developer Facing)
During this sprint, the backend team implemented an actor database to support storing and searching actor records. We also added OAuth and JWT authentication to support secure user login. Document upload functionality was implemented across both the backend and frontend, and the frontend UI was refined to improve script search and interaction. The application was containerized using Docker and temporarily deployed live on Railway for testing and validation.

## Unfinished Work
The frontend is still missing approximately 35% of the functionality currently supported by the backend. Additional work is needed to fully integrate and display the actor database, as well as to implement user permission features such as a review and approval process. The UI also needs further refinement to improve overall usability and polish. On the backend, JWT authentication has not yet been fully tested, and we plan to coordinate with WSU IT in the next sprint to properly validate the implementation.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:

 * Docker Deployment
 * Actor Database
 * JWT and oAuth Functionality
 * Document Upload

 
 
 ## Incomplete Issues/User Stories
 Here are links to issues we worked on but did not complete in this sprint:
 
 * User permission
 * Review Process
 * Login security (frontend)
 * Version Control (frontend)

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
   The backend has made significant progress toward the final product, including successfully deploying a non-local version of the system on Railway. The actor database is robust, and the APIs and document upload functionality are well developed. The frontend has also improved, with a more user friendly interface for managing script creation.
 
Here's what we'd like to improve:
   The frontend is still missing some functional requirements that we had hoped to complete by this point. Additionally, one time scheduling conflicts have made it difficult for the team to attend weekly meetings consistently. However, we have maintained constant and open communication with the client to ensure continued alignment and progress.
  
Here are changes we plan to implement in the next sprint:
   By the next sprint we'd like to work with WSU IT have test our JWT implementation and deployment. We also aim to enable the frontend to fully utilize all backend features and further refine user roles and the overall user interface to improve usability and functionality.