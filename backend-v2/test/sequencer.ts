import { BaseSequencer, type TestSpecification } from 'vitest/node';

/** Runs test files in name order (1-db … 5-platform): later files change shared sample data. */
export default class NameSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    return [...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }
}
