Network Stat
============

### A Dashboard widget displaying LAN and WAN information ###

This widget was originally developed at the Widgetschmiede (http://www.widgetschmie.de/), but as our work life became more intense, no time was left to maintain those widgets. Now, 3 years after the last update, I still get email of people using it, maybe the community will take better care of it than I am capable of doing.

I'll happily accept pull requests, so fork along!


Creating the widget
-------------------

There is a simple Bash script that creates the widget package from this whole checkout. You can build the Cocoa widget plugin yourself, for simplicity reasons I'll also include a readily built binary in the repository so you don't have to, if you don't want.

    $ ./pack.sh


The code
--------

It's pretty old. It should be refactored 28 times. Other than that, it mostly works.
