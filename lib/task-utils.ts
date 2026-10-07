export const MAX_TASK_TITLE_LENGTH = 200;

export function getTaskTitleError(title: string) {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) return "Write a task before adding it.";
  if (normalizedTitle.length > MAX_TASK_TITLE_LENGTH) {
    return `Tasks must be ${MAX_TASK_TITLE_LENGTH} characters or fewer.`;
  }

  return null;
}
