Update your `README.md` using the template below. We are specifically interested in the installation instructions (e.g., all the gems, how to load real or seed data, etc.). This sample README was developed for a Rails project, so you can swap the "Gems" section of the "Installation" instructions to include add-ons that are relevant to you.

If any of the sections in this template grows to more than one screen, consider placing it in its own file and linking to it from this file. Those files could live in a subdirectory called `docs`.

**Make sure to check out the repo anew and test your installation instructions.**

Provide a README file with the following information:

# VCC Standardized Patient File Management System

## Project summary

### One-sentence description of the project

We are developing a secure file management system for the Virtual Clinical Center at the WSU Elson S. Floyd College of Medicine to standardize, store, and manage standardized patient scripts and actor information.

### Additional information about the project

The Elson S. Floyd College of Medicine Virtual Clinical Center (VCC) is a simulation-based medical training facility where students interact with actors portraying patients in realistic clinical scenarios. These simulations allow students to practice clinical and communication skills in a controlled environment without risk to real patients.

Actors use detailed documents called scripts to portray specific patient cases. These scripts contain critical information such as symptoms, emotional context, medical history, and behavioral guidance. Scripts also include door notes, which provide students with patient background information before beginning the encounter, closely mirroring real clinical workflows.

The current system for managing these scripts is inefficient and makes it difficult to search, update, and reuse materials. Our system aims to improve efficiency by providing a centralized platform for storing, uploading, searching, and managing scripts and actor data. The system includes secure authentication, role-based access control, document upload functionality, and a searchable actor database. This will allow faculty and staff to maintain scripts more effectively, improve accessibility, and streamline simulation preparation.

## Installation

### Prerequisites

Before running the project, ensure you have the following installed:

-Git

-Docker

-Docker Compose

-Node.js (v18 or newer)

-npm (v9 or newer)

Docker is the recommended method for running the project.

### Add-ons

The system includes the following components and add-ons:

-Docker containerization for consistent development and deployment

-PostgreSQL database for persistent data storage

-JWT authentication for secure user sessions

-OAuth support for secure login

-Document upload support for storing standardized patient scripts

-REST API backend for data management

-Frontend UI for script and actor interaction

### Installation Steps

1) Clone the repository
git clone https://github.com/your-organization/vcc-script-management.git
cd vcc-script-management

2) Build and start the application using Docker:
docker compose build
docker compose up

4) If running for the first time, initialize the database:
docker compose exec backend rake db:create db:migrate db:seed

Once complete, the application will be available at:
http://localhost:8080

## Functionality

Our current functionality includes:

-Frontend user interface for interacting with scripts and system features

-Backend REST API connected to a PostgreSQL database

-Actor database capable of storing and searching actor information

-Document upload functionality for standardized patient scripts

-Secure authentication using OAuth and JWT

-Dockerized deployment for consistent local and cloud environments


## Known Problems

The frontend currently does not support all backend functionality, including some actor database features and permission workflows.

JWT authentication has been implemented but is still undergoing testing and validation.

Some UI elements require additional refinement and usability improvements.

These issues are planned to be addressed in upcoming sprints.




## Additional Documentation

Sprint Report 1: see Docs/Reports/SprintReport1
Sprint Report 2: see Docs/Reports/SprintReport2

Sprint 1 Demo Video:
https://wsu.zoom.us/rec/share/7Cc0iUsm9x1lwttFchLfB1PRf-Uxs5_q9nS2Rev8zL9UJ8Q0LK5QfFZxG4BDP9bG.FjzCEcx27-cbwzKm?startTime=1759604683000

Sprint 2 Demo Video:
https://youtu.be/PnNy0X9g1Lo

Trello Kanban Board:
https://trello.com/invite/b/68c7a3b4bfa57287b7440aa7/ATTI4a0922bacbc3e3c98925d62a0e50d30d83D0FB70/vcc-database

Sprint 3 Demo Video:
https://youtu.be/unOS4VFygaE