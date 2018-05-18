CLNDR.js
========

You can find the original and best CLNDR by Kyle Stetz [here](https://github.com/kylestetz/CLNDR)!

So far, I've:
 * begun stripping out jQuery
 * removed the jquery.json (since this is not a jquery plugin no more).
 * I opted to return an instance instead of the CLNDR class.

 So instead of `$("selector").clndr(options)` we have

    import * as clndr from 'clndr';
    const calendar = clndr.createInstance('.selector', options);

