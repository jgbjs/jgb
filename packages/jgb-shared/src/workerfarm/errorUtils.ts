export function errorToJson(error: any) {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    const jsonError = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    // Add all custom codeFrame properties
    Object.keys(error).forEach((key: keyof Error) => {
      jsonError[key] = error[key];
    });
    return jsonError;
  }
}

export function jsonToError(json: any) {
  if (json) {
    const error: any = new Error(json.message);
    Object.keys(json).forEach(key => {
      error[key] = json[key];
    });
    return error;
  }
}
