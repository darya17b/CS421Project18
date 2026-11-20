# Sprint 2 Report (October 11, 2026 -- November 9, 2026)

[YouTube link of Sprint 2](https://youtu.be/OtNGZJ03JeE)

## What's New (User Facing)
* User authentication and login page
* Preview / Download scripts based on role
* JSON script import / export


## Work Summary (Developer Facing)
This sprint, our team built on the codebase we inherited from the previous student team, focusing on access control and script handling. Because the original system had no user accounts, we worked with our client to choose a request-access model where an Admin approves each user and assigns a role, rather than university SSO, which would have required WSU IT approval and ongoing maintenance the VCC wants to handle itself. With roles in place, we tied script preview and download permissions to them and added JSON import and export. Our biggest barrier was getting comfortable with a codebase we didn’t write, including the Docker setup and how the frontend and backend connect, which slowed us down early until we traced through the existing code and documented how it worked. We learned that settling design decisions with the client before writing code saved us rework, and that building role checks into the foundation kept later features much simpler.


## Unfinished Work
We were unable to fully implement the JSON import and export feature due to the complex nature of the feature. This feature will be our top priority in the following sprint due to the value it provides our client.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:

 * [Login System](https://github.com/AndrewN4675/VCC-Script-Management/issues/8)
 * [Preview/Export by Master, SP, or Faculty](https://github.com/AndrewN4675/VCC-Script-Management/issues/10)
 
 ## Incomplete Issues/User Stories
 
 * [Import/Export Script as JSON](https://github.com/AndrewN4675/VCC-Script-Management/issues/9)
   * High implementation complexity requiring multiple refactors of the existing codebase

## Code Files for Review
All files which were actively developed on during this sprint are available through the following pull requests:

* [Login system](https://github.com/AndrewN4675/VCC-Script-Management/pull/26)
* [Preview / Export Script PDF's by Master, SP, or Faculty](https://github.com/AndrewN4675/VCC-Script-Management/pull/25)
* [Cleanup files](https://github.com/AndrewN4675/VCC-Script-Management/pull/6)
* [consolidate docker and remove unused files](https://github.com/AndrewN4675/VCC-Script-Management/pull/4)
 
## Retrospective Summary
Here's what went well:
  * Succesfully delivered 2 features that were at the top of the clients requests
  * Mostly finished cleaning up the repository by removing unused files and upgrading dependencies
  * Felt more comfortable contributing to the system, and feel knowledgeable on the codebase.
 
Here's what we'd like to improve:
   * Time management, completing features before the deadline and getting client feedback earlier
   * Improve code quality by reducing the nunber of PRs that are merged into main without checks
   * Collaboration between team members on design choices and implimentatons
  
Here are changes we plan to implement in the next sprint:
   * Set strict deadlines for our features to be implimented by, prior to a sprints end.
   * Impliment a stricter code review phase, requiring approvals from each team member before a PR can be merged into main
   * Impliment a more collaborative approach where each team member provides what feature they are going to tackle and how they plan on implimenting it. Each team member can then provide feedback on the implimentation outline.
