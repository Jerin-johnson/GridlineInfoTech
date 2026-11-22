# Branching Strategy

## 1. Purpose

This document defines the branching strategy used to manage development, bug fixes, and releases for the Automotive E-Commerce Platform.

The strategy aims to maintain a stable codebase, isolate development work, simplify integration, and maintain a meaningful Git history.

## 2. Strategy

We follow a simplified feature-branch workflow based on the main branch.

Since this project is developed by a single developer, we avoid maintaining additional long-lived branches such as `develop`, which would introduce unnecessary branch synchronization and merge overhead.

Instead, all development work is performed in short-lived feature or fix branches created from `main`.

## 3. Branch Types

### 3.1 Main Branch

Branch:

`main`

Purpose:

- Contains stable and deployable code.
- Serves as the primary branch of the repository.
- Acts as the source for production deployments.
- Should remain in a working and buildable state.

Direct development on `main` should be avoided.

### 3.2 Feature Branches

Naming convention:

`feat/<feature-name>`

Purpose:

- Develop new features independently.
- Isolate unfinished work from the stable branch.
- Allow features to be tested before integration.

Examples:

- `feat/homepage`
- `feat/product-catalog`
- `feat/user-authentication`
- `feat/shopping-cart`
- `feat/crypto-checkout`
- `feat/admin-dashboard`

### 3.3 Fix Branches

Naming convention:

`fix/<issue-name>`

Purpose:

- Resolve bugs or incorrect behavior.
- Isolate fixes before integrating them into the main branch.

Examples:

- `fix/cart-quantity-validation`
- `fix/product-filtering`
- `fix/order-total-calculation`

### 3.4 Hotfix Branches

Naming convention:

`hotfix/<issue-name>`

Purpose:

- Address critical issues affecting deployed or production functionality.
- Allow urgent fixes to be isolated from ongoing development.

Examples:

- `hotfix/payment-verification`
- `hotfix/authentication-failure`

Hotfix branches are used only when urgent production fixes are required.

## 4. Branch Workflow

All feature and fix branches are created from the latest `main` branch.

```text
main
 │
 ├── feature/homepage
 │
 ├── feature/product-catalog
 │
 ├── feature/shopping-cart
 │
 ├── feature/crypto-checkout
 │
 └── fix/cart-validation
```

### Development Process

1. Ensure the `main` branch is up to date.
2. Create a feature or fix branch from `main`.
3. Implement the changes within the branch.
4. Test the changes and verify the application.
5. Commit changes using the project's commit conventions.
6. Merge the branch into `main` after verification.
7. Delete the branch after successful integration if it is no longer needed.

## 5. Why This Strategy?

This project is developed by a single developer within a limited timeframe.

Maintaining multiple long-lived branches such as `main`, `develop`, and `release` would introduce additional synchronization and merge overhead without providing significant benefits for this project.

A simplified feature-branch workflow provides:

- **Isolation:** Unfinished features do not directly affect the stable branch.
- **Stability:** `main` remains the primary stable and deployable branch.
- **Traceability:** Each feature or fix has its own development history.
- **Simpler integration:** Completed work can be tested before merging.
- **Reduced overhead:** Avoids maintaining and synchronizing unnecessary long-lived branches.
- **Flexibility:** Features can be developed and integrated independently.

## 6. Branch Naming Rules

- Use lowercase letters.
- Use kebab-case for multi-word names.
- Use descriptive names.
- Prefix branches with their purpose.
- Avoid spaces and special characters.
- Keep branch names concise.

Examples:

```text
feature/product-catalog
feature/crypto-checkout
fix/order-validation
hotfix/payment-failure
```

## 7. Branch Lifecycle

Feature and fix branches are temporary.

```text
Create Branch
     ↓
Development
     ↓
Testing
     ↓
Merge into main
     ↓
Delete Branch
```

Branches should be deleted after merging to keep the repository clean.

## 8. Branch Protection and Quality

Before integrating changes into `main`:

- Ensure the feature works as expected.
- Run relevant tests.
- Verify that the application builds successfully.
- Review the changes.
- Ensure no secrets or sensitive information are included.
- Confirm that existing functionality has not been unintentionally broken.

As a solo developer, pull requests may be used for self-review and documentation of changes, but are not mandatory for every feature.

## 9. Summary

The project uses a simplified feature-branch workflow with `main` as the stable branch.

Short-lived feature, fix, and hotfix branches are created as needed. This approach provides development isolation, stability, and traceability while keeping the workflow practical for a single developer and a time-constrained project.
