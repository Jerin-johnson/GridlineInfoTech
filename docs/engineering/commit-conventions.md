# Commit Conventions

## 1. Purpose

Commit messages provide a clear history of changes made to the project.

Consistent commit messages help us:

- Understand what changed without opening every file.
- Track features, bug fixes, and improvements.
- Maintain a clean and readable Git history.
- Identify changes easily when reviewing the project.

This project follows a simplified version of **Conventional Commits**.

---

## 2. Commit Message Format

Every commit should follow this format:

`<type>(<scope>): <description>`

### Example

```bash
feat(products): add product filtering
```

| Component     | Description                          |
| ------------- | ------------------------------------ |
| `type`        | The category of change               |
| `scope`       | The area of the application affected |
| `description` | A short explanation of the change    |

The scope is optional when the change affects the entire project.

```bash
chore: initialize project configuration
```

---

## 3. Commit Types

| Type       | Purpose                                                      |
| ---------- | ------------------------------------------------------------ |
| `feat`     | Introduces a new feature                                     |
| `fix`      | Fixes a bug                                                  |
| `refactor` | Improves code structure without changing behavior            |
| `docs`     | Adds or updates documentation                                |
| `style`    | Changes formatting or styling without changing functionality |
| `test`     | Adds or updates tests                                        |
| `perf`     | Improves performance                                         |
| `build`    | Changes build tools or dependencies                          |
| `ci`       | Changes CI/CD configuration                                  |
| `chore`    | General maintenance tasks                                    |

---

## 4. Commit Scopes

Scopes identify the area affected by a change.

Common scopes for this project include:

- `frontend`
- `backend`
- `auth`
- `products`
- `cart`
- `orders`
- `payments`
- `inventory`
- `admin`
- `database`
- `config`
- `docs`
- `infra`

Scopes should be short, descriptive, and consistent.

---

## 5. Commit Message Examples

### Features

```bash
feat(products): add product filtering
feat(cart): support quantity updates
feat(auth): implement user registration
feat(payments): add crypto checkout
feat(admin): add product management dashboard
```

### Bug Fixes

```bash
fix(cart): prevent quantity from exceeding stock
fix(auth): handle expired access tokens
fix(inventory): prevent negative stock
fix(checkout): validate shipping information
```

### Refactoring

```bash
refactor(auth): extract token generation service
refactor(products): simplify product query logic
```

### Documentation

```bash
docs(database): document product schema
docs(api): add checkout endpoint documentation
docs: update project setup instructions
```

### Tests

```bash
test(cart): add quantity validation tests
test(orders): cover order creation
```

### Maintenance

```bash
chore: initialize project structure
chore(config): update environment configuration
build: configure typescript build
ci: add github actions workflow
```

---

## 6. Commit Message Rules

Commit messages should:

- Be written in lowercase.
- Use a clear and descriptive scope when applicable.
- Start with an imperative description.
- Keep the description concise.
- Describe the change rather than the implementation details.
- Avoid unnecessary punctuation at the end.
- Represent one logical change whenever possible.

### Good Examples

```bash
feat(products): add category filtering
fix(cart): prevent invalid quantities
docs: document local development setup
refactor(auth): simplify authentication middleware
```

### Avoid

```bash
update files
```

```bash
fixed some bugs
```

```bash
final changes
```

```bash
changes done
```

These messages don't provide enough information about the changes.

---

## 7. Commit Size

Commits should represent small, logical units of work.

Instead of committing an entire feature with unrelated changes, divide it into meaningful commits when practical.

### Example

```bash
feat(products): create product model
feat(products): add product repository
feat(products): implement product listing endpoint
feat(products): add product filtering
```

This makes the development history easier to understand and troubleshoot.

However, commits should not be unnecessarily small. The goal is to maintain a meaningful history, not create a commit for every minor code change.

---

## 8. Commit Message Body

A commit message body is optional.

Use it when additional context is required to explain:

- Why the change was made.
- Important implementation decisions.
- Limitations or trade-offs.
- Breaking changes.

Example:

```bash
feat(payments): add testnet transaction verification

Verify transaction details before creating an order.
Only confirmed transactions are accepted.
```

For simple changes, a single-line commit message is sufficient.

---

## 9. Project Standard

For this project, commit messages should be:

- Consistent
- Descriptive
- Concise
- Focused on one logical change
- Easy to understand from the Git history

The objective is to maintain a professional and readable commit history without introducing unnecessary Git complexity.
