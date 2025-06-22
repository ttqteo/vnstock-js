# Test Running Instructions

This document provides instructions for running tests in the vnstock-js project.

## Basic Commands

### Run All Tests
```bash
pnpm test
```

### Run Specific Test File
```bash
pnpm test src/company.test.ts
```

### Run Specific Test Suite
```bash
pnpm test -t "Company Data"
# or
pnpm test -t "VCI Stock Market Data"
```

### Run Specific Test
```bash
pnpm test -t "should fetch company overview"
# or
pnpm test -t "should fetch price board data for given symbols"
```

### Run Tests with Verbose Output
```bash
pnpm test -- --verbose
```

## Test Outputs
All test outputs are saved in the `test-outputs` directory for reference and debugging purposes.
