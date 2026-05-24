const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const defaultLevel = process.env.NODE_ENV === "test" ? "error" : "info";
const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() ?? defaultLevel;
const activeLevel = LEVELS[configuredLevel] ?? LEVELS.info;

function serializeError(error) {
  if (!error) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  };
}

function write(level, message, meta = {}) {
  if (LEVELS[level] < activeLevel) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    service: "websocket",
    level,
    message,
    ...meta,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug(message, meta) {
    write("debug", message, meta);
  },
  info(message, meta) {
    write("info", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  error(message, error, meta = {}) {
    write("error", message, { ...meta, error: serializeError(error) });
  },
};
