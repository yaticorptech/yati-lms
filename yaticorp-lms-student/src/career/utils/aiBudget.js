/**
 * @description Reading a spent-allowance refusal off an Axios error.
 *
 * Lives apart from AiBudgetNotice because it is a function, not a component,
 * and a file that exports both breaks React Fast Refresh.
 */
/**
 * Pull the budget details out of an Axios error, or null if it was not one.
 *
 * Every AI endpoint answers a spent allowance with 429 and a `code`, so this is
 * the single place the frontend has to know that shape.
 */
export const readAiBudgetError = (err) => {
  const res = err?.response;
  if (res?.status !== 429 || !res?.data?.code) return null;
  return { code: res.data.code, message: res.data.message, resetsAt: res.data.resetsAt };
};
