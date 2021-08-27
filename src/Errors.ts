// Need special handling to enable subclassing of errors
// eslint-disable-next-line max-len
// See https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
export class BaseError extends Error {
  constructor(message?: string) {
    const trueProto = new.target.prototype;
    super(message);
    Object.setPrototypeOf(this, trueProto);
  }
}

// Represents an error that is caused by bad user input
// e.g. an unsupported branch type
export class InputError extends BaseError {}

// Represents an error in the configuration file.
export class ConfigurationError extends InputError {}

// Represents some kind of programmer logic error, see
// https://ericlippert.com/2008/09/10/vexing-exceptions/
export class BoneheadedError extends BaseError {}

// Represents an unfortunate error with external causes, possibly
// retryable. Again, see https://ericlippert.com/2008/09/10/vexing-exceptions/
export class ExogeneousError extends BaseError {}
