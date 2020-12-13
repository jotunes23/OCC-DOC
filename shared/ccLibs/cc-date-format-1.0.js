/**
 * @fileoverview Extension of moment.js for formatting and localization
 * @version: 1.0
 *
 */
define(
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
  'ccDate',

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['moment','ccConstants','ccLogger'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(moment, CCConstants, CCLogger) {
    "use strict";

    function CCDate() {
    }

    // Constants
    CCDate.prototype.DEFAULT_DATE_FORMAT = "MM-DD-YYYY HH:mm:ss.SSS";

    /**
     * Localized date formatter
     * CCDate is basically a wrapper for moment.js. Init function just
     */
    CCDate.prototype.init = function(locale) {
      // Moment defaults to en so don't need to load anything if locale equals en
      if(locale != CCConstants.DEFAULT_LANG) {
        // From require.js 2.1.10 it is observed that there is a delay of 4 milliseconds
        // added by require to load the dependencies as part of context.nextTick.But this
        // delay is creating problem for us loading the respective moment locale files
        // before the widgets are loaded.
        requirejs.s.contexts._.nextTick = function(fn){fn();}
        require(['momentLangs/' + locale.toLowerCase()], function() {
        }, function(err) {
          CCLogger.warn('No language file found for locale ' + locale);
        });
        //Reset the overridden behavior so that loading behavior of other modules is not affected
        requirejs.s.contexts._.nextTick = requirejs.nextTick;
      }
    };

    /**
     * From moment.js documentation, formats are as follows for en
     * LT   : h:mm A                  e.g. 12:00 PM
     * L    : MM/DD/YYYY              e.g. 01/27/2014
     * LL   : MMM Do YYYY             e.g. January 27 2014
     * LLL  : MMM Do YYY LT           e.g. January 27 2014 12:00 PM
     * LLLL : dddd, MMMM Do YYYY LT   e.g. Monday, January 27 2014 12:00 PM
     */
    CCDate.prototype.formats = {
      'time' : 'LT',
      'short' : 'L',
      'medium' : 'LL',
      'long' : 'LLL',
      'full' : 'LLLL',
      'default' : 'LL'
    };

    /**
     * Retrieves the date format string from moment based on the current locale and the requested
     * date size (see CCDate.formats)
     * @param {formatName} The format name to get the date string for
     * @returns The date format string
     */
    CCDate.prototype.getDateFormat = function (formatName) {
      //It's unclear if there's a more accepted way of getting the date format
      //as a string
      if(formatName) {
        return moment.localeData()._longDateFormat[this.formats[formatName]];
      } else {
        return moment.localeData()._longDateFormat[this.formats['default']];
      }
    };

    /**
     * Function that will take a partial date string and return a new one in
     * the users current time zone. Used to handle dates that have lost timezone
     * information and need to be formatted by one of the formatting functions
     * @param {string} date The date to format
     * @param {boolean} setTimeZone Set to true if passing in a UTC string
     * @returns a date string in the current timezone
     */
    CCDate.prototype.setDateToTimeZone = function(date, setTimeZone) {
      var returnDate = '', gmtOffset, now;

      if (!date) {
        return false;
      }

      // grab the current gmt offset by parsing a standard new date object
      now = new Date();
      gmtOffset = now.toString().split(' ')[5].split('T')[1];

      // manually replace utc with gmt
      if(setTimeZone) {
        date = date.slice(0,19) + gmtOffset;
      }

      returnDate = moment(date).format();
      return returnDate;
    };

    CCDate.prototype.formatDateForEndpoint = function(date, asUTC) {
      var momentDate;

      if(!date) {
        return false;
      }

      if(asUTC) {
        momentDate = moment(date).format();
      } else {
        momentDate = moment(date);
      }

      return momentDate;
    };

    /**
     * Format an ISO date to a specified output format
     * @param {string} date The date to format
     * @param {string} outputFormat The output format
     * @param {string} formatName One of CCDate.formats : time, short, medium, long, full, default
     * @returns The formatted date string
     */
    CCDate.prototype.dateTimeFormatter = function (date, outputFormat, formatName) {
      var format = '', momentDate;

      if (!date) {
        return false;
      }

      if (outputFormat) {
        format += outputFormat;
      } else {
        if (!formatName) {
          format = this.formats['default'];
        }
        else {
          format = this.formats[formatName] ? this.formats[formatName] : this.formats['default'];
        }
      }

      // format the date to whatever is being requested and return the result
      momentDate = moment(date).format(format);
      return momentDate;
    };

    /**
     * Formats the dates and times optionally given the correct formats.
     * An optional format can also be given for a dirty date value that cannot be
     * normally translated by moment.js.
     * Also a separator can be given between date and time.
     * @param {pDate} the date to format
     * @param {pCustomInputFormat} use to specify date format if it's a non ISO8601 format
     * @param {pCustomOutputFormat} use to specify custom output format, if one of the predefined formats does not meet requirements
     * @param {pFormatName} one of CCDate.formats : time, short, medium, long, full, default
     *
     * @returns the date and time in the specified localized format
     */
    CCDate.prototype.formatDateAndTime = function (pDate, pCustomInputFormat, pCustomOutputFormat, pFormatName) {
      var self = this;
      var pFormat = "";

      // can't format a null String
      if (!pDate) {
        return "";
      }

      // Handles the case when format is specifically given.
      // This overrides any date and time formatting and separators
      // and gives the date and time in the format given.
      if (pCustomOutputFormat) {
        pFormat += pCustomOutputFormat;
      } else {
        if (!pFormatName) {
          pFormat = this.formats['default'];
        }
        else {
          pFormat = this.formats[pFormatName] ? this.formats[pFormatName] : this.formats['default'];
        }
      }

      var pMomentDate = null;

      // Handling of the custom formatted date
      if (pCustomInputFormat) {

        // ensure expected format of pDate [because Safari is the worst at dates]
        if(!moment(pDate, pCustomInputFormat).isValid()) {
          pDate = moment(pDate).format(pCustomInputFormat);
        }

        pDate = moment(pDate, pCustomInputFormat).format(self.DEFAULT_DATE_FORMAT);
        pMomentDate = moment(pDate, self.DEFAULT_DATE_FORMAT);
      } else {
        pMomentDate = moment(pDate);
      }

      //TODO IMPORTANT: This returns the date formatted to the browser's current locale and
      //does not provide the ability to override the date timezone to a set timezone
      return pMomentDate.format(pFormat);
    };

    /**
     * Parses the dates and times string along with input format to get the moment date object.
     * @param {pDate} the date string to parse
     * @param {pInputFormat} use to specify date format of the input pDateString
     *
     * @returns the date and time moment object
     *          This moment date object toString() method can be used to verify if the date is valid or not
     */
    CCDate.prototype.parseDateAndTime = function (pDateString, pInputFormat) {
      var momentDate = null;

      // can't parse a null date or with null format
      if (!pDateString || !pInputFormat) {
        return "";
      }

      // Handling of the custom formatted date
      momentDate = moment(pDateString, pInputFormat);

      return momentDate;
    };

    return new CCDate();
  }
);