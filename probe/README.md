# custody-probe

`supervisorctl status` reports the state of each process controlled by Supervisor: running, stopped,
fatally crashed. However it does not display the state of _subprocesses_. This becomes a problem
when using Supervisor for local development of microservices, where the processes launched by
Supervisor are not the servers themselves but rather build processes, which in turn launch the servers. The process tree might look something like this:

```
supervisord
  - gulp (using gulp-nodemon)
    - node
```

If `node` crashes, `gulp` will remain healthy, and so `supervisorctl status` will fool you into
thinking that all services are running when they're not.

If you're using [custody](https://github.com/mixmaxhq/custody) as a front-end to Supervisor, you
can fix this by adding a single line of code to your webserver:

```js
require('custody-probe')('app');
```

Now if the "app" webserver crashes, custody will report "app" in state "FATAL" and will only switch
back to "RUNNING" when the webserver comes back up.

## Installation

```sh
npm install --dev custody-probe
```

## Usage

```js
if (process.env.NODE_ENV === 'development') {
  require('custody-probe')('NAME_OF_PROGRAM');
}
```

If you've installed this as a dev dependency (recommended) you'll need to restrict it to running
in your development environment, as shown using `process.env.NODE_ENV`.

The argument to custody-probe is the name of the Supervisor program to which this Node process
belongs. Find the name of the program in your `supervisord.conf` file like `[program:NAME_OF_PROGRAM]`.

(The program name is _usually_ what's shown in the `name` column of `supervisorctl status` and
`custody`, too, except if you have associated the program with a Supervisor group, in which case
the column will read `NAME_OF_GROUP:NAME_OF_PROGRAM`.)

We recommend you add the probe to only **1 (one) process** controlled by each program, since as of
v1.0.0 custody only has support for displaying one process' state (in addition to what Supervisor
reports normally). If you add the probe to more processes within the same program, the states will
overwrite each other.

## Contributing

We welcome bug reports and feature suggestions!
