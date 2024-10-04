import type { UserConfig } from "@commitlint/types";

const Configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    function ignoreDependabot(commit: string) {
      return commit.includes("<support@github.com>") && commit.includes("dependabot");
    },
  ],
  rules: {
    "signed-off-by": [2, "always", "Signed-off-by"],
  },
};

export default Configuration;
