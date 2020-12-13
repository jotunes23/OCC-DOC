/**
 * Client side error codes should be defining in this module
 * Client side error codes start from 15000
 */
define('ccClientErrorCodes', [],function() {"use strict";

  function CCClientErrorCodes() {
  }

  // Raised when a syntax error occurs while parsing code in eval()
  CCClientErrorCodes.SYNTAX_ERROR = "15000";
  // Raised when de-referencing an invalid reference
  CCClientErrorCodes.REFERENCE_ERROR = "15001";
  // Raised when a variable or parameter is not a valid type
  CCClientErrorCodes.TYPE_ERROR = "15002";
  // Raised when an error occurs executing code in eval()
  CCClientErrorCodes.EVAL_ERROR = "15003";
  // Raised when a numeric variable or parameter is outside of its valid range
  CCClientErrorCodes.RANGE_ERROR = "15004";
  // Raised when encodeURI() or decodeURI() are passed invalid parameters
  CCClientErrorCodes.URI_ERROR = "15005";
  CCClientErrorCodes.GENERIC_ERROR = "15006";
  //IE sometimes does not send any error type
  CCClientErrorCodes.NO_SPECIFIED_ERROR = "15007";
  // error for widget javascript files.
  CCClientErrorCodes.FILE_IS_NOT_AN_EXTENSION = "15008";

  return CCClientErrorCodes;
});

