import { randomInt } from "crypto";

import { normalizeAuthEmail } from "@/lib/auth-email";
import { registerSchema } from "@/lib/validations/auth";
import { assertDatabaseAccess } from "@/server/local-database-guard";

const EMAIL_LOCAL_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const PASSWORD_LOWER_ALPHABET = "abcdefghjkmnpqrstuvwxyz";
const PASSWORD_UPPER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGIT_ALPHABET = "23456789";
const PASSWORD_SYMBOL_ALPHABET = "!@#$%^&*-_=+";
const PASSWORD_COMBINED_ALPHABET =
  PASSWORD_LOWER_ALPHABET +
  PASSWORD_UPPER_ALPHABET +
  PASSWORD_DIGIT_ALPHABET +
  PASSWORD_SYMBOL_ALPHABET;
const NICKNAME_STEMS = [
  "maru",
  "bori",
  "nabi",
  "momo",
  "hari",
  "dori",
  "coco",
  "tori",
  "juno",
  "somi",
] as const;
const EMAIL_DOMAIN_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const DEFAULT_TEST_USER_COUNT = 4;
const MIN_TEST_USER_COUNT = 1;
const MAX_TEST_USER_COUNT = 10;
const DEFAULT_EMAIL_LOCAL_LENGTH = 20;
const DEFAULT_PASSWORD_LENGTH = 30;
export const TEST_USER_PROVISION_CONFIRM_VALUE = "PRODUCTION";

export type ProvisionTestUsersConfig = {
  databaseUrl: string;
  count: number;
  emailDomain: string;
  outputFile?: string;
};

export type GeneratedTestUserCredential = {
  email: string;
  nickname: string;
  password: string;
};

function pickRandomCharacter(alphabet: string) {
  return alphabet[randomInt(0, alphabet.length)] ?? alphabet[0] ?? "";
}

function shuffleCharacters(input: string[]) {
  const values = [...input];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex]!, values[index]!];
  }
  return values;
}

function hasRepeatedRun(value: string, maxRun = 4) {
  return new RegExp(`(.)\\1{${maxRun - 1},}`).test(value);
}

function buildRandomString(alphabet: string, length: number) {
  return Array.from({ length }, () => pickRandomCharacter(alphabet)).join("");
}

function generateEmailLocalPart() {
  return `${pickRandomCharacter("abcdefghijklmnopqrstuvwxyz")}${buildRandomString(
    EMAIL_LOCAL_ALPHABET,
    DEFAULT_EMAIL_LOCAL_LENGTH - 1,
  )}`;
}

function generateNickname() {
  return `${NICKNAME_STEMS[randomInt(0, NICKNAME_STEMS.length)]}-${buildRandomString(
    "abcdefghijklmnopqrstuvwxyz23456789",
    5,
  )}`;
}

function generateStrongPassword() {
  while (true) {
    const required = [
      pickRandomCharacter(PASSWORD_LOWER_ALPHABET),
      pickRandomCharacter(PASSWORD_UPPER_ALPHABET),
      pickRandomCharacter(PASSWORD_DIGIT_ALPHABET),
      pickRandomCharacter(PASSWORD_SYMBOL_ALPHABET),
    ];
    const remainingLength = DEFAULT_PASSWORD_LENGTH - required.length;
    const randomCharacters = Array.from({ length: remainingLength }, () =>
      pickRandomCharacter(PASSWORD_COMBINED_ALPHABET),
    );
    const password = shuffleCharacters([...required, ...randomCharacters]).join("");

    if (hasRepeatedRun(password)) {
      continue;
    }

    const parsed = registerSchema.safeParse({
      email: "qa@example.com",
      nickname: "qa-user",
      password,
    });
    if (parsed.success) {
      return password;
    }
  }
}

export function resolveProvisionTestUsersConfig(
  env: NodeJS.ProcessEnv,
): ProvisionTestUsersConfig {
  const databaseUrl = assertDatabaseAccess({
    env,
    confirmEnvKey: "TEST_USER_PROVISION_CONFIRM",
    confirmValue: TEST_USER_PROVISION_CONFIRM_VALUE,
    operationLabel: "non-local database provisioning",
  });

  const emailDomain = env.TEST_USER_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!emailDomain || !EMAIL_DOMAIN_REGEX.test(emailDomain)) {
    throw new Error(
      "TEST_USER_EMAIL_DOMAIN must be a valid owned domain like qa-login.example.com.",
    );
  }

  const parsedCount = Number(env.TEST_USER_COUNT ?? DEFAULT_TEST_USER_COUNT);
  if (!Number.isInteger(parsedCount) || parsedCount < MIN_TEST_USER_COUNT || parsedCount > MAX_TEST_USER_COUNT) {
    throw new Error(`TEST_USER_COUNT must be an integer between ${MIN_TEST_USER_COUNT} and ${MAX_TEST_USER_COUNT}.`);
  }

  const outputFile = env.TEST_USER_OUTPUT_FILE?.trim() || undefined;
  return {
    databaseUrl,
    count: parsedCount,
    emailDomain,
    outputFile,
  };
}

export function generateProvisionTestUserCredentials(params: {
  count: number;
  emailDomain: string;
  existingEmails?: Iterable<string>;
  existingNicknames?: Iterable<string>;
}) {
  const credentials: GeneratedTestUserCredential[] = [];
  const usedEmails = new Set(
    Array.from(params.existingEmails ?? [], (value) => normalizeAuthEmail(value)),
  );
  const usedNicknames = new Set(Array.from(params.existingNicknames ?? []));

  while (credentials.length < params.count) {
    const email = normalizeAuthEmail(`${generateEmailLocalPart()}@${params.emailDomain}`);
    const nickname = generateNickname();
    if (!email || usedEmails.has(email) || usedNicknames.has(nickname)) {
      continue;
    }

    usedEmails.add(email);
    usedNicknames.add(nickname);
    credentials.push({
      email,
      nickname,
      password: generateStrongPassword(),
    });
  }

  return credentials;
}
