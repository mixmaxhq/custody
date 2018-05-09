# custody

Supervisor is great for running a bunch of processes but not for running a local, microservices
development environment, where

* services frequently become unstable due to quirks of developers' setups or bugs in Supervisor
itself ([Mixmax-internal link](https://docs.google.com/document/d/1H37o4X51M5dWzrF5q_bOuZNaaag8iQYMebTEwjhJWBk/edit#heading=h.5tsycreyssqn))
* the processes monitored by Supervisor may be build e.g. `gulp` processes, not the services whose
statuses change i.e. webservers
* developers need to rapidly toggle between views of the environment's overall status and logs from
individual services

`supervisorctl status`' is too high-level and static for such an environment, and toggling between
that view and individual process logs is cumbersome.

Enter `custody`, which gives you a _realtime_ view of both the environment's overall status and
individual services' logs with _minimum keystrokes_.

## Installation

This project should eventually expose a binary to be installed globally.

For now, clone this somewhere, then run `npm install && npm run build`.

## Usage

Make sure that Supervisor is running on port 9001 (Mixmax engineers: this is your default).

This project should eventually expose a binary to invoke.

For now, build the project using `npm run build`, then run `npm run start`.

## Contributing / Roadmap

We welcome bug reports and feature suggestions. PRs are even better!

Check out the issues and milestones to see what you could tackle to get this project to v1 and
beyond.
