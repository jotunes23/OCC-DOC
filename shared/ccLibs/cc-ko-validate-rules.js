/**
 * @fileoverview Cloud Commerce custom rules for Ko Validate.
 *
 */
/*global $ */
define('ccKoValidateRules',
       ['knockout', 'jqueryui', 'koValidate', 'ccPasswordValidator'],
       function (ko, jQueryUI, koValidate, CCPasswordValidator) {

  "use strict";

  /**
   * Contains custom knockout validators for Cloud Commerce.
   * @namespace koValidation
   */

  /*
   * NOTE NOTE NOTE NOTE
   *
   * All validators in this file need to have an entry in the
   * validation-translator.js file.  validation-translator.js is run to ensure
   * the validation messages are returned in the proper locale.
   */

  /**
   * Adds a credit card number validation rule to koValidate.
   * @public
   * @class Credit card validation.
   * @requires koValidate
   * @name creditcard
   * @memberof koValidation
   * @example
   * self.cardNumber.extend({ creditcard:{ iin: iinObservable, length: lengthObservable } });
   * @example
   * self.cardNumber.extend({ creditcard:{ iin: iinObservable, length: lengthObservable, message errorMsg } }
   */
  ko.validation.rules['creditcard'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.creditcard
     * @param {string} val The credit card number to be validated
     * @param {Object} params Object containing the Card IIN and Card Number length observables.
     * The value of these observables should be updated appropriately for the card type
     * IIN value can contain a single number, a range of numbers e.g. '[3-6]'
     * or a list of numbers separated by the '|' character (i.e. an OR symbol)
     * Length value can contain a single number, a comma-seperated range of numbers
     * e.g. '3,6' or a list of numbers separated by the '|' character.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val, params) {
      var self = this;

      if(!params) {
        return false;
      }

      if(!params.iin || !params.length
          || !ko.isObservable(params.iin)
          || !ko.isObservable(params.length)) {
        return false;
      }

      var cardIIN    = params.iin();
      var cardLength = params.length();

      if(!cardIIN || !cardLength
         || cardIIN === '' || cardLength === '' ) {
        return false;
      }

      if(!val || val === '') {
        if(cardLength === '0') {
          // No length requirement
          // Not up to this rule to enforce
          // whether val is required or not
          return true;
        } else {
          return false;
        }
      }

      var cardNumber = val;

      var iinPattern = new RegExp('^('+cardIIN+')');

      if(!cardNumber.match(iinPattern)) {
        // Failed IIN pattern match
        return false;
      }

      var cardLengthArray = cardLength.split('|');
      var lengthPatternStr = '';

      for(var i=0; i < cardLengthArray.length; i++) {
        if(i!==0) { lengthPatternStr += '|'; }

        lengthPatternStr += '^[0-9]{' + cardLengthArray[i] + '}$';
      }

      var lengthPattern = new RegExp(lengthPatternStr);

      if(!cardNumber.match(lengthPattern)) {
        // Failed length match
        return false;
      }

      var luhnMod10 = function (cardNumber) {
        var total = 0;
        var length = cardNumber.length;

        for(var i=1; i<=length; i++) {

          var digit = parseInt(cardNumber[(length - i)], 10);

          if(i%2 == 0) {
            digit *= 2;
            if(digit>9) {
              // as digit max is 18
              // digit%10 + 1 == -9
              digit -= 9;
            }
          }
          total += digit;
        }
        return (total%10 == 0);
      };

      if(!luhnMod10(cardNumber)) {
        //Failed Mod 10 check
        return false;
      }

      // All good
      return true;
    },

    // Default message
    message: 'Card Number is invalid.'
  };

  /**
   * Adds a cvv (card verification value) validation rule to koValidate.
   * @public
   * @class Card verification value (CVV) validation.
   * @memberof koValidation
   * @name cvv
   * @requires koValidate
   * @example
   * self.cvv.extend({ cvv: requiredCVVLengthObs });
   * @example
   * self.cvv.extend({ cvv:{ params: requiredCVVLengthObs, message errorMsg } }
   */
  ko.validation.rules['cvv'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.cvv
     * @param {string} val The cvv value to be validated. Should be a digit string, eg '456' or '4567'.
     * @param {observable<integer>} requiredCVVLength The object containing the required cvv length value.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val, requiredCVVLength) {
      var self = this;

      if(!requiredCVVLength) {
        return false;
      }

      var requiredLength = 0;

      if(ko.isObservable(requiredCVVLength)) {
        requiredLength = requiredCVVLength();
      } else {
        requiredLength = requiredCVVLength;
      }

      requiredLength = parseInt(requiredLength, 10);

      if(!val || val === '') {

        if(requiredLength === 0) {
          // No length requirement
          // Not up to this rule to enforce
          // whether val is required or not
          return true;
        } else {
          return false;
        }
      }

      var cvvPattern = new RegExp('^[0-9]{'+requiredLength+'}$');

      if(!val.match(cvvPattern)) {
        // Failed pattern match
        return false;
      }

      // All good
      return true;
    },
    // Default message
    message: 'Card CVV is invalid.'
  };


  /**
   * Rather than perform the combined month & year
   * date validation twice (once for each field)
   * the outcome is saved to the observables below
   * by the month validation rules and then simply
   * accessed by the year validation rules.
   */
  var _startDateValid = ko.observable(true);
  var _endDateValid = ko.observable(true);


  /**
   * Adds a start month validation rule to koValidate.
   * The 'startmonth' and 'startyear' combination must be equal to or
   * before the current month and year.
   * @public
   * @class Start month validation.
   * @memberof koValidation
   * @requires koValidate
   * @name startmonth
   * @example
   * self.startMonth.extend({ startmonth: startYearObs });
   * @example
   * self.startMonth.extend({ startmonth:{ params: startYearObs, message errorMsg } }
   */
  ko.validation.rules['startmonth'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.startmonth
     * @param {string} val The month value to be validated. Should be a 2 digit string, eg '06'.
     * @param {observable<string>} startYear The observable containing the start year value.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val, startYear) {
      var self = this;

      if(!startYear || !ko.isObservable(startYear)) {
        return false;
      }

      if(!val || val === '') {
        // Not up to this rule to enforce
        // whether val is required or not
        return true;
      }

      var startMonth = val;

      var monthPattern = new RegExp('^((0[1-9])|(1[0-2]))$');

      if(!startMonth.match(monthPattern)) {
        // Failed month pattern match
        return false;
      }

      if(!startYear()) {
        // no start year value
        // so month is good based
        // on what is known
        return true;
      }

      var currentDate = new Date();
      var currentYear = currentDate.getUTCFullYear();
      var currentMonth = currentDate.getUTCMonth(); //zero indexed!

      if(parseInt(startYear(), 10) === currentYear) {
        // must specify radix to avoid leading zero
        // month values being treated as octal
        if(parseInt(startMonth,10) > (++currentMonth)) {
          // Month not reached yet.
          _startDateValid(false);
          return false;
        }
      }

      // All good
      _startDateValid(true);
      return true;
    },
    // Default message
    message: 'Start Month is invalid.'
  };

  /**
   * Adds a start year validation rule to koValidate.
   * The 'startmonth' and 'startyear' combination must be equal to or
   * before the current month and year.
   * @public
   * @class Start year validation.
   * @memberof koValidation
   * @requires koValidate
   * @name startyear
   * @example
   * self.startYear.extend({ startyear:{} });
   * @example
   * self.startYear.extend({ startmonth:{ message errorMsg } }
   */
  ko.validation.rules['startyear'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.startyear
     * @param {string} val The year value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {
      if(!val || val === '') {
        // Not up to this rule to enforce
        // whether val is required or not
        return true;
      }

      // return result of combined month & year
      // date validation as determined by month
      // validatior rule.
      return _startDateValid();
    } ,
    // Default message
    message: 'Start Year is invalid.'
  };


  /**
   * Adds a validation rule for import file extension.
   * Import files can have only csv or xls type of extensions.
   * @public
   * @class Import filename extension validation.
   * @memberof koValidation
   * @requires koValidate
   * @name importFileName
   * @example
   * this.importFilename.extend({
   *   'importFileName': { params: true,
   *    message: CCi18n.t('ns.common:resources.invalidFileExtensionMessageText'),
   *          'notify': { id: 'import-file-validation'}
   *   }
   * });
   */
  ko.validation.rules['importFileName'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.importFileName
     * @param {string} val Name of the file to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {
      var exts = ['.csv'];
      return (new RegExp('(' + exts.join('|').replace(/\./g, '\\.') + ')$')).test(val);
    },
    message: 'invalid file extension.'
  };

  /**
   * Adds a validation rule for media file extension.
   * Media files can have only .zip type of extensions.
   * @public
   * @class Media file extension validation.
   * @memberof koValidation
   * @requires koValidate
   * @name mediaZipFileName
   * @example
   * this.uploadFilename.extend({
   *    'required': {
   *      params: true,
   *      message: CCi18n.t('ns.catalog:resources.pleaseSelectAFileText'),
   *        'notify': { id: 'media-file-required-validation' }
   *    },
   *    'mediaZipFileName': {
   *      params: true,
   *      message: CCi18n.t('ns.catalog:resources.pleaseSelectAValidFileTypeText'),
   *        'notify': { id: 'media-file-type-validation' }
   *    },
   *  });
   */
  ko.validation.rules['mediaZipFileName'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.mediaZipFileName
     * @param {string} val Name of the file to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {
      var exts = ['.zip'];
      return (new RegExp('(' + exts.join('|').replace(/\./g, '\\.') + ')$')).test(val);
    }
  };

  /**
   * Adds an end month validation rule to koValidate.
   * The 'endmonth' and 'endyear' combination must be equal to or
   * after the current month and year.
   * @public
   * @class End month validation.
   * @memberof koValidation
   * @requires koValidate
   * @name endmonth
   * @example
   * self.endMonth.extend({ endmonth: endYearObs });
   * @example
   * self.endMonth.extend({ endmonth:{ params: endYearObs, message errorMsg } }
   */
  ko.validation.rules['endmonth'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.endmonth
     * @param {string} val The month value to be validated. Should be a 2 digit string, eg '06'.
     * @param {observable<string>|string} endYear The observable containing the end year value.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val, endYear) {
      var self = this;

      if(!val || val === '') {
        // Not up to this rule to enforce
        // whether val is required or not
        return true;
      }

      var endMonth = val;

      var monthPattern = new RegExp('^((0[1-9])|(1[0-2]))$');

      if(!endMonth.match(monthPattern)) {
        // Failed month pattern match
        return false;
      }

      if(!endYear) {
        // no end year value
        // so month is good based
        // on what is known
        return true;
      }

      var currentDate = new Date();
      var currentYear = currentDate.getUTCFullYear();
      var currentMonth = currentDate.getUTCMonth(); //zero indexed!

      if(parseInt(endYear, 10) === currentYear) {
        // must specify radix to avoid leading zero
        // month values being treated as octal
        if(parseInt(endMonth,10) < (++currentMonth)) {
          // month has passed
          _endDateValid(false);
          return false;
        }
      }

      // All good
      _endDateValid(true);
      return true;
    },
    // Default message
    message: 'End Month is invalid.'
  };


  /**
   * Adds a end year validation rule to koValidate.
   * The 'endmonth' and 'endyear' combination must be equal to or
   * after the current month and year.
   * @public
   * @class End year validation.
   * @memberof koValidation
   * @requires koValidate
   * @name endyear
   * @example
   * self.endYear.extend({ endyear:{} });
   * @example
   * self.endYear.extend({ endmonth:{ message errorMsg } }
   */
  ko.validation.rules['endyear'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.endyear
     * @param {string} val The year value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {
      if(!val || val === '') {
        // Not up to this rule to enforce
        // whether val is required or not
        return true;
      }

      // return result of combined month & year
      // date validation as determined by month
      // validatior rule.
      return _endDateValid();
    } ,
    // Default message
    message: 'End Year is invalid.'
  };

  /**
   * Adds a pattern validation rule to koValidate, which uses an observable
   * to allow the pattern to be changed dynamically.
   * NB: the standard pattern rule doesn't work with observables for the pattern
   * @public
   * @class Pattern validation based on the value of an observable.
   * @memberof koValidation
   * @requires koValidate
   * @name observablePattern
   * @example
   * self.myObservable.extend({ observablePattern: obsPattern });
   * @example
   * self.myObservable.extend({ observablePattern:{ params: obsPattern, message errorMsg } }
   */
  ko.validation.rules['observablePattern'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.observablePattern
     * @param {string} val The value to be validated. Should be a string.
     * @param {observable<string>|string} obsPattern The observable or string containing the pattern value.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val, obsPattern) {
      var self = this;

      if(!obsPattern) {
        // rule not set up correctly
        return false;
      }

      var patternStr = '';

      if(ko.isObservable(obsPattern)) {
        patternStr = obsPattern();
      } else {
        patternStr = obsPattern;
      }

      if(!patternStr || patternStr === '') {
        // rule not set up correctly
        return false;
      }

      if(!val || val === '') {
        // Not up to this rule to enforce
        // whether val is required or not
        return true;
      }

      var regExpPattern = new RegExp(patternStr);

      if(!val.match(regExpPattern)) {
        // Failed pattern match
        return false;
      }

      // All good
      return true;
    },
    // Default message
    message: 'Observable Pattern Match Failed.'
  };

  /**
   * Adds a validation rule for alphanumeric field values.
   * @public
   * @class Alphanumeric value validation.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumeric
   * @example
   * viewModel.label.extend({required: true, alphaNumeric: true});
   */
  ko.validation.rules['alphaNumeric'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumeric
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9(\s)]+$/);
    },
    message: "Field may only contain alphanumeric characters"
  };

  /**
   * Adds a validation rule for boolean field values.
   * @public
   * @class Boolean value validation.
   * @memberof koValidation
   * @requires koValidate
   * @name bool
   * @example
   * myBooleanProperty.extend({bool: true});
   */
  ko.validation.rules['bool'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.bool
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return value === true || !value;
    },
    message: "Value must be true or false"
  };

  /**
   * Adds a validation rule for alphanumeric field value assuming there will
   * potentially be separator characters.
   * <p>
   * Separator characters can be dash "-", space or underscore "_".
   * @public
   * @class Alphanumberic validation, allowing separator characters.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumericWithSeperators
   * @example
   * viewModel.label.extend({required: true, alphaNumericWithSeperators: true});
   */
  ko.validation.rules['alphaNumericWithSeperators'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumericWithSeperators
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9_\-\s]+$/);
    },
    message: "Field may only contain alphanumeric characters and -, spaces, or _"
  };

  /**
   * Adds a validation rule for alphanumeric field value with NO spaces and
   * assuming there will potentially be separator characters.
   * <p>
   * Separator characters can be dash "-" or underscore "_".
   * @public
   * @class Alphanumberic validation, allowing separator characters, excluding space.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumericNoSpacesWithSeperators
   * @example
   * viewModel.label.extend({required: true, alphaNumericNoSpacesWithSeperators: true});
   */
  ko.validation.rules['alphaNumericNoSpacesWithSeperators'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumericNoSpacesWithSeperators
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9_\-]+$/);
    },
    message: "Field may only contain alphanumeric characters and - or _"
  };

  /**
   * Adds a validation rule for alphanumeric field value with NO spaces and NO dashes
   * assuming there will potentially be separator characters.
   * <p>
   * Separator characters can be underscore "_".
   * @public
   * @class Alphanumberic validation, allowing separator characters, excluding space and dash.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumericNoSpacesNoDashesWithSeperators
   * @example
   * viewModel.label.extend({required: true, alphaNumericNoSpacesNoDashesWithSeperators: true});
   */
  ko.validation.rules['alphaNumericNoSpacesNoDashesWithSeperators'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumericNoSpacesWithSeperators
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9_]+$/);
    },
    message: "Field may only contain alphanumeric characters and _"
  };

  /**
   * Adds a validation rule for alphanumeric field value with NO spaces and NO dashes
   * assuming there will potentially be separator characters.
   * <p>
   * Separator characters can be underscore "_".
   * @public
   * @class Alphanumberic validation, allowing separator characters, excluding space and dash.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumericNoSpacesNoDashesWithSeperators
   * @example
   * viewModel.label.extend({required: true, alphaNumericNoSpacesNoDashesWithSeperators: true});
   */
  ko.validation.rules['alphaNumericNoSpacesNoDashesWithSeperators'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumericNoSpacesWithSeperators
     * @param {string} val The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9_]+$/);
    },
    message: "Field may only contain alphanumeric characters and _"
  };

  /**
   * Adds a validation rule for a field value with NO forward or
   * back slashes.
   * @public
   * @class No forward or back slash validation.
   * @memberof koValidation
   * @requires koValidate
   * @name restrictSlashCharacters
   * @example
   * viewModel.label.extend({required: true, restrictSlashCharacters: true});
   */
  ko.validation.rules['restrictSlashCharacters'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.restrictSlashCharacters
     * @param {string} value The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || !value.match(/[\/\\]+/);
    },
    message: "Field may not contain forwardslash or backslash."
  };

  /**
   * Validation rule to ensure a string is alpha numeric (A-Z,0-9,-,_) with
   * no white space.
   * @public
   * @class Alphanumeric with no spaces validation.
   * @memberof koValidation
   * @requires koValidate
   * @name alphaNumericNoSpaces
   * @example
   * myObservable.extend({ alphaNumericNoSpaces: true });
   */
  ko.validation.rules['alphaNumericNoSpaces'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.alphaNumericNoSpaces
     * @param {string} value The value to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value) {
      return !value || value.match(/^[A-Za-z0-9]+$/);
    },
    message: "Field may only contain alphanumeric characters and no spaces"
  };

  /**
   * Adds specific cart picker validation to koValidate.
   * For each cart picker item, if the product ID is populated, then the quantity
   * must be a valid integer between 1 and 99.
   * @private
   * @class Cart picker validation.
   * @memberof koValidation
   * @requires koValidate
   * @name cartPicker
   * @example
   * self.myObservable.extend({ cartPicker:});
   * @example
   * self.myObservable.extend({ cartPicker:{ message errorMsg } }
   */
  ko.validation.rules['cartPicker'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.cartPicker
     * @param {CartPickerItemViewModel[]} val The cart picker items to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {

      if (! val){
        return true;
      }

      var i,
      arraySize = val.length;
      for(i = 0; i < arraySize; i++ ){

        var intQuantity = parseInt(val[i].quantity, 10);

        if ((val[i].productId != "") ){

          if ((isNaN(intQuantity) ) || (intQuantity <= 0) || (intQuantity >= 100)) {
            return false;
          }
        } else {
          if (val[i].quantity != ""){
            return false;
          }
        }
      }

      // check for duplicated in the array
      var filledRows = 0, out=[],
        obj={};

      for (i=0;i<arraySize;i++) {
        if (val[i].productId != "") {

          obj[val[i].productId]=0;
          filledRows = filledRows + 1;
        }
      }

      for (i in obj) {
        out.push(i);
      }

      if (filledRows > out.length){
        return false;
      }

      return true;
    },
    message: "Please ensure each item has a quantity specified"
  };

  /**
   * Adds cart picker unique product validation to koValidate.
   * Ensures there are no duplicate products in the cart.
   * @private
   * @class Cart picker unique product validation.
   * @memberof koValidation
   * @requires koValidate
   * @name cartPickerUniqueProducts
   * @example
   * this.editItem().skuIds.extend({
   *    cartPicker: {
   *      message: CCi18n.t('ns.design:resources.cartPickerNoQuantity')
   *    },
   *    cartPickerUniqueProducts : {
   *      message: CCi18n.t('ns.design:resources.cartPickerDuplicates')
   *    }
   *  });
   */
  ko.validation.rules['cartPickerUniqueProducts'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.cartPickerUniqueProducts
     * @param {CartPickerItemViewModel[]} val The cart picker items to be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (val) {

      if (! val){
        return true;
      }

      var i,
      arraySize = val.length,
      filledRows = 0,
      out=[],
      obj={};

      // check for duplicated in the array

      for (i=0; i<arraySize; i++) {
        if (val[i].productId != "") {

          obj[val[i].productId]=0;
          filledRows = filledRows + 1;
        }
      }

      for (i in obj) {
        out.push(i);
      }

      if (filledRows > out.length){
        return false;
      }

      return true;
    },
    message: "Please ensure there are no Duplicate product IDs"
  };

  /**
   * Adds a validation rule for price fields.
   * @public
   * @class Price field validation.
   * @memberof koValidation
   * @requires koValidate
   * @name price
   * @example
   * this.price.extend({price: true});
   */
  ko.validation.rules['price'] = {

    // TODO THIS NEEDS TO BE UPDATED to follow the proper precision for
    // localized currency

    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.price
     * @param {string} value Value to be validated.
     * @param {boolean} validate Flag indicating if the price should be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (value, validate) {
      if (!validate) {
        return true;
      }
      return value === null || typeof value === 'undefined' ||
        value === "" || /^\d*\.?\d+$/.test(value);
    },
    message: 'Please enter a valid price'
  };

  /**
   * Ensure the date entered is after the current date.
   * @public
   * @class Later date validation.
   * @memberof koValidation
   * @requires koValidate
   * @name laterDate
   * @example
   * this.myDate.extend({laterDate: true});
   */
  ko.validation.rules['laterDate'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.laterDate
     * @param {string} value Value to be validated
     * @param {params} params Validation parameters.
     * @returns {boolean} Validation success - true or false.
     */
    validator : function(value, params) {
      var userDate, currentDate, difference;
      if (value) {
        userDate = new Date(value);
        currentDate = new Date();
        difference = currentDate - userDate;
        return difference < 0;
      } else {
        return false;
      }
    },
    message : 'Please enter a proper date'
  };

  /**
   * Ensure the value is a valid URL.
   * @public
   * @class URL validation.
   * @memberof koValidation
   * @requires koValidate
   * @name url
   * @example
   * this.myURL.extend({url: true});
   */
  ko.validation.rules['url'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.url
     * @param {string} value Value of the URL to be validated.
     * @param {Object} params can be either a simple boolean or an Object. As a
     * boolean, it indicates if validation should occur. As an object it will
     * have a sub-property "validate" to do the same thing and also another
     * flag "protocolOptional" to indicate if the value can be valid without a
     * protocol present.
     * @returns {boolean} Validation success - true or false.
     */
    validator : function(value, params) {

      // "validate" can be a boolean or an Object
      // as a boolean -- that's easy
      // as an object -- it will have a property "validate"
      if (typeof params ==="boolean" && !params) {
        return true;
      } else if (params instanceof Object
                 && params.validate
                 && params.validate === false) {
        return true;
      }

      // default to requiring the protocol unless the params instruct otherwise
      var protocolOptional = false;
      if (params instanceof Object && params.protocolOptional) {
        protocolOptional = params.protocolOptional;
      }

      /*
       * Human-readable explanation of the regex.  If the regex changes, please
       * upate this comment.
       *
       * 1. 1st capturing group: line can start with ftp, http, or https
       * 2. :// must exist
       * 3. 2nd capturing group: TODO what purpose does that group serve?
       * 4. 3rd capturing group: matches any non-whitespace character
       * 5. 4th capturing group: matches numbers representing the port
       * 6. 5th capturing group: matches any of the contained characters 0 or more times
       *
       * Sample URL:  http://www.example.com
       *
       * http -- matched in 1st capturing group
       * :// -- exactly matched
       * www.example.com -- matched in 5th capturing group
       *
       * Note that this regex permits ://www.example.com
       *
       * "noProtocolUrlRegex" tests w/o a protocol
       */
      var noProtocolUrlRegex = /^(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-\/]))?$/;
      var protocolUrlRegex =  /^(ftp|http|https)?:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-\/]))?$/;
      if (value) {
        var initialArray = value.split("\n");
        var finalArray = [];
        for(var index = 0; index < initialArray.length; index++) {
          var tempArray = initialArray[index].split(",");
          for(var tempIndex = 0; tempIndex < tempArray.length; tempIndex++) {
            finalArray.push(tempArray[tempIndex]);
          }
        }

        /*
         * string starts with ftp, http, or https
         * follow by the literal string "://"
         */
        var startsWithProtocol = /^(ftp|http|https):\/\//;

        // contains :// anywhere in the string
        var containsSchemaSeparator = /:\/\//;

        for (var i = 0; i < finalArray.length; i++) {

          // protocol is optional and there is no protocol
          if (protocolOptional
              && !containsSchemaSeparator.test(finalArray[i].trim())
              && !startsWithProtocol.test(finalArray[i].trim())) {
            if (!noProtocolUrlRegex.test(finalArray[i].trim())) {
              return false;
            }
          }

          // whether or not the protocol is optional, there is a protocol
          else {
            if (!protocolUrlRegex.test(finalArray[i].trim())) {
              return false;
            }
          }
        }
        return true;
      } else {
        return true;
      }
    },
    message : 'Please enter a valid URL'
  };

   /**
    * Ensure the value is a valid URL.
    * <p>
    * Handles the case where the URL is a full, absolute URL, e.g. "http://www.company.com/path/to/mypage",
    * or just the resource path of URL, beginning with forward slash, e.g. /aboutUs
    * @public
    * @class URL validation.
    * @memberof koValidation
    * @requires koValidate
    * @name url
    * @example
    * this.myURL.extend({url: true});
    */
   ko.validation.rules['absoluteOrRelativeURL'] = {
     /**
      * Validator function.
      * @function validator
      * @memberof koValidation.url
      * @param {string} value Value of the URL to be validated.
      * @param {boolean} validate Flag indicating if the URL should be validated.
      * @returns {boolean} Validation success - true or false.
      */
     validator : function(value, validate) {
       if (!validate) {
         return true;
       }

       var re_fullurl = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))?\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
       var re_resource_path = /^\/\S*$/i;

       if (value) {
         // Test full URI first
         if (!re_fullurl.test(value)) {
           // Test for a path starting with /
           if (!re_resource_path.test(value)) {
             return false;
           }
         }
         return true;
       } else {
         return true;
       }
     },
     message : 'Please enter a valid URL'
   };

  /**
   * Ensure the value is a valid number.
   * @public
   * @class Number validation.
   * @memberof koValidation
   * @requires number
   * @name number
   * @example
   * this.myNumberProperty.extend({number: true});
   */
  ko.validation.rules['number'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.number
     * @param {string} value Value to be validated.
     * @param {boolean} validate Flag indicating if the number should be validated.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function (value, validate) {
      if (!validate) {
        return true;
      }
      return value === null || typeof value === 'undefined' || value === "" || (validate && /^-?\d*\.?\d+$/.test(value));
    },
    message: 'Please enter a number'
  };

  /**
   * Ensure the value is equal to another specified value.
   * @public
   * @class Field equality validation.
   * @memberof koValidation
   * @name match
   * @example
   * this.myProperty.extend({match: 12345});
   * @example
   * this.myProperty.extend({match: 123.45});
   * @example
   * this.myProperty.extend({match: 'test'});
   * @example
   * this.myProperty.extend({match: function() { return 12345; }});
   */
  ko.validation.rules['match'] = {
    getValue: function (type) {
      return (typeof type === 'function' ? type() : type);
    },
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.match
     * @param {string} value Value to be validated.
     * @param {string|number|function} validate The value to be compared against. May be a string,
     * number or a function that returns a value.
     * @returns {boolean} Validation success - true or false.
     */
    validator: function(value, validate) {
      return value === this.getValue(validate);
    },
    message: 'Values must match'
  };

  /**
   * Validation rule to ensure that property id of the newly created property is not already in use.
   * @public
   * @class Unique property ID validation.
   * @memberof koValidation
   * @requires koValidate
   * @name propertyIdAlreadyInUse
   * @example
   * propertySettingsid.extend({
   *   'propertyIdAlreadyInUse': { params : {existingPropertyids: this.propertyDefinitionPropertiesList, createProperty : this.createProperty},
   *     message : CCi18n.t('ns.common:resources.propIdAlreadyUsedMessage')
   *   }
   * });
   */
  ko.validation.rules['propertyIdAlreadyInUse'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.propertyIdAlreadyInUse
     * @param {string} val The value to be validated
     * @param {Object} params An object containing the following properties:
     * <ul>
     *   <li>{observable&lt;boolean&gt;} createProperty Create the property?</li>
     *   <li>{observable&lt;Obect[]&gt;} existingPropertyids List of existing property ID.</li>
     * </ul>
     * @returns {boolean} Validation success - true or false.
     */
    validator : function(val, params) {
      var existingId;
      if (params && val && params.createProperty()) {
        if (params.existingPropertyids()) {
          var list = params.existingPropertyids;
          for (var i = 0, len = params.existingPropertyids().length; i < len; ++i) {
            if(params.existingPropertyids()[i]) {
              existingId = params.existingPropertyids()[i].id;
              if (existingId) {
                if (val.toLowerCase() === existingId.toLowerCase()) {
                  return false;
                }
              }
            }
          }
        }
      }
      // All good
      return true;
    },
    // Default message
    message : 'Property Id is already in use'
  };

    /**
   * Validation rule to ensure that property name of the newly created property is not already in use.
   * @public
   * @class Unique property Name validation.
   * @memberof koValidation
   * @requires koValidate
   * @name propertyNameAlreadyInUse
   * @example
   * propertySettingsid.extend({
   *   'propertyIdAlreadyInUse': { params : {existingPropertyName: this.propertyDefinitionPropertiesList, createProperty : this.createProperty},
   *     message : CCi18n.t('ns.common:resources.propertyNameAlreadyInUse')
   *   }
   * });
   */
  ko.validation.rules['propertyNameAlreadyInUse'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.propertyNameAlreadyInUse
     * @param {string} val The value to be validated
     * @param {Object} params An object containing the following properties:
     * <ul>
     *   <li>{observable&lt;boolean&gt;} createProperty Create the property?</li>
     *   <li>{observable&lt;Obect[]&gt;} existingPropertyName List of existing property names.</li>
     * </ul>
     * @returns {boolean} Validation success - true or false.
     */

    validator : function(val, params) {
      var existingProperty;
      if (params && val) {
        if (params.existingPropertyName()) {
          var list = params.existingPropertyName;
          for (var i = 0, len = params.existingPropertyName().length; i < len; ++i) {
            if(params.existingPropertyName()[i]) {

              existingProperty = params.existingPropertyName()[i].displayName;
              if (existingProperty) {

                if (params.createProperty()) {
                  if (val.toLowerCase() === existingProperty.toLowerCase()) {
                    return false;
                  }
                } else {
                  if (params.prevPropertyName() != "" && params.prevPropertyName() != null && val.toLowerCase() !== params.prevPropertyName().toLowerCase() && val.toLowerCase() === existingProperty.toLowerCase()) {
                    return false;

                  }
                }
            }

            }
          }
        }
      }
      // All good
      return true;
    }
,
    // Default message
    message : 'Property Name is already in use'
  };

  /**
   * Validation rule to ensure that the password conforms to the password policies that are currently enabled.
   * <p>
   * embeddedAssistance extender works with this to show the embedded assistance message.
   * If there is a need to use require extender, use it after this to ensure that the embeddedAssistance comes
   * up correctly.
   * @public
   * @class Password validation.
   * @memberof koValidation
   * @requires koValidate
   * @requires ccPasswordValidator
   * @name password
   * @example
   * samplePassword.extend({
   *   password: {
   *     params: { policies: self.passwordPolicies, login: self.emailAddress,
   *       observable: self.samplePassword,
   *       includePreviousNPasswordRule: self.includePreviousNPasswordRule },
   *       message: CCi18n.t('ns.common:resources.passwordPoliciesErrorText')
   *   }}
   * });
   */
  ko.validation.rules['password'] = {
      /**
       * Validator function.
       * @function validator
       * @memberof koValidation.password
       * @param {string} value The password to be validated.
       * @param {Object} params The parameter object, expected to contain the following observables:
       * <ul>
       *   <li>{observable&lt;string&gt;} login - The login/email address of the user.</li>
       *   <li>{observable&lt;Object&gt;} policies - The object containing the password policies.</li>
       *   <li>{observable&lt;boolean&gt;} includePreviousNPasswordRule - Check if the password matches any of the last N passwords?</li>
       *   <li>{observable&lt;string&gt;} observable - The observable that corresponds to the password field,
       * </ul>
       * @returns {boolean} Validation success - true or false.
       */
      validator : function(value, params) {
        var email = params.login();
        var policies = params.policies();
        var observable = params.observable;
        var includePreviousNPasswordRule = params.includePreviousNPasswordRule();
        // Validate the password
        var passed = CCPasswordValidator.validate(value, email, policies, includePreviousNPasswordRule);
        observable.embeddedAssistance = ko.observable(CCPasswordValidator.embeddedAssistance);
        return passed;
      },
      message: 'The password entered does not comply with the password policy'
  };

  /**
   * Wraps the ko validation 'unique' validator and trims spaces from the value before checking,
   * so that a value with spaces at the end will still fail validation if the rest of the string matches.
   * @public
   * @class Unique string validation, taking into account whitespace at either end.
   * @memberof koValidation
   * @name uniqueTrimmed
   * @example
   * this.editItem().properties.displayName.extend({
   *    uniqueTrimmed: {
   *      params: {
   *        collection: self.availableShippingRegionNames,
   *        externalValue: ""
   *      },
   *      message: CCi18n.t('ns.settings:resources.shippingReginUniqueMsg')
   *    }
   * });
   */
  ko.validation.rules['uniqueTrimmed'] = {
    /**
     * Validator function.
     * @function validator
     * @memberof koValidation.uniqueTrimmed
     * @param {string} value Value to be validated.
     * @param {Object} params Parameters object.
     * @returns {boolean} Validation success - true or false.
     */
    validator : function(value, params) {
      return ko.validation.rules['unique'].validator(value.trim(), params);
    }
  };

   /**
    * Wraps the ko validation 'unique' validator and trims spaces from the value before checking,
    * so that a value with spaces at the end will still fail validation if the rest of the string matches.
    * Also ensure that comparison is case insensitive - convert value to lower case note that collection used
    * to validate against must also be in lower case!
    * @public
    * @class Unique string validation, taking into account whitespace at either end, and ignoring case.
    * @memberof koValidation
    * @name uniqueTrimmedCaseInsensitive
    * @example
    * this.editItem().displayName.extend({
    *    uniqueTrimmedCaseInsensitive: {
    *      params: {
    *        collection: self.availableLayoutNames,
    *        externalValue: ""
    *      },
    *      message:  CCi18n.t('ns.design:resources.layoutNameNotUnique')
    *    }
    * });
    */
   ko.validation.rules['uniqueTrimmedCaseInsensitive'] = {
     /**
      * Validator function.
      * @function validator
      * @memberof koValidation.uniqueTrimmedCaseInsensitive
      * @param {string} value Value to be validated.
      * @param {Object} params Parameters object.
      * @returns {boolean} Validation success - true or false.
      */
     validator : function(value, params) {
       if (!value) {
         // Avoid calling toLowerCase on null
         // Add required rule if null isn't acceptable
         return true;
       }
       return ko.validation.rules['uniqueTrimmed'].validator(value.toLowerCase(), params);
     }
   };

   /**
    * Validates the total item quantity in cart against the updatable quantity of a particular line item in the cart.
    * @public
    * @memberof koValidation
    * @name maxItemQuantity
    * @example
    * this.updatableQuantity.extend({maxItemQuantity:{params: {orderableQuantity:maxOrderableQuantity,
            totalQuantity:this.getItemCountInCart, orderLimit:orderLimit}, message: insufficientStockMsg}});
    */
    ko.validation.rules['maxItemQuantity'] = {
      validator : function(value, params) {
        if (params && value) {
          if (params.orderableQuantity && params.totalQuantity && params.totalQuantity(true) > params.orderableQuantity) {
            return false;
          } else if (params.orderLimit && params.orderLimit < params.totalQuantity(false)) {
            return false
          } else if ((typeof params === 'number') && value > params) {
            return false;
          }

          if (params.childItems) {
            for (var i = 0; i < params.childItems.length; i++) {
              var productId = params.childItems[i].productId;
              if (params.totalQuantity && params.totalQuantity(false, productId) > params.childItems[i].orderableQuantity) {
                return false;
              }
            }
          }
        }
        return true;
      }
    }

  ko.validation.registerExtenders();

});