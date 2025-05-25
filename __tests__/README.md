# Test Running Instructions

This document provides instructions for running tests in the vnstock-js project.

## Basic Commands

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test src/company.test.ts
# or
npm test src/vnstock.test.ts
```

### Run Specific Test Suite
```bash
npm test -t "Company Data"
# or
npm test -t "VCI Stock Market Data"
```

### Run Specific Test
```bash
npm test -t "should fetch company overview"
# or
npm test -t "should fetch price board data for given symbols"
```

### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

## Test Outputs
All test outputs are saved in the `test-outputs` directory for reference and debugging purposes.
