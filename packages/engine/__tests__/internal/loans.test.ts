import { describe, it, expect } from "vitest";
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  getLoanBalanceAtDate,
  getTotalInterestPaid,
  getTotalPaymentsMade,
  getMonthlyPaymentAtDate,
} from "../../src/internal/loans";
import type { LoanDTO } from "../../src/types";

describe("loan utilities", () => {
  describe("calculateMonthlyPayment", () => {
    it("calculates standard mortgage payment", () => {
      // $200,000 at 4% APR for 30 years
      const payment = calculateMonthlyPayment(200000, 0.04, 360);
      expect(payment).toBeCloseTo(954.83, 2);
    });

    it("calculates auto loan payment", () => {
      // $30,000 at 5% APR for 5 years
      const payment = calculateMonthlyPayment(30000, 0.05, 60);
      expect(payment).toBeCloseTo(566.14, 2);
    });

    it("handles 0% interest", () => {
      // $12,000 at 0% for 12 months
      const payment = calculateMonthlyPayment(12000, 0, 12);
      expect(payment).toBe(1000);
    });

    it("handles 1-month term", () => {
      const payment = calculateMonthlyPayment(1000, 0.05, 1);
      expect(payment).toBeCloseTo(1004.17, 2);
    });
  });

  describe("generateAmortizationSchedule", () => {
    it("generates full schedule for simple loan", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 10000,
        aprPct: 6,
        termMonths: 12,
        startDate: "2024-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

      expect(schedule.length).toBe(12);
      expect(schedule[0].month).toBe("2024-01");
      expect(schedule[11].month).toBe("2024-12");
      // Balance should be very close to 0 (within a few cents)
      expect(schedule[11].balance).toBeLessThan(1);
    });

    it("total payments equal principal plus interest", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "PERSONAL",
        name: "Personal Loan",
        principal: 5000,
        aprPct: 8,
        termMonths: 24,
        startDate: "2024-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2025-12-31");

      const totalPayments = getTotalPaymentsMade(schedule);
      const totalInterest = getTotalInterestPaid(schedule);
      const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);

      expect(totalPrincipal).toBeCloseTo(5000, 1);
      expect(totalPayments).toBeCloseTo(totalPrincipal + totalInterest, 2);
    });

    it("extra payments reduce total interest", () => {
      const loanNoExtra: LoanDTO = {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 20000,
        aprPct: 5,
        termMonths: 60,
        startDate: "2024-01-01",
      };

      const loanWithExtra: LoanDTO = {
        ...loanNoExtra,
        extraPaymentMonthly: 100,
      };

      const scheduleNoExtra = generateAmortizationSchedule(loanNoExtra, "2024-01-01", "2028-12-31");
      const scheduleWithExtra = generateAmortizationSchedule(loanWithExtra, "2024-01-01", "2028-12-31");

      const interestNoExtra = getTotalInterestPaid(scheduleNoExtra);
      const interestWithExtra = getTotalInterestPaid(scheduleWithExtra);

      expect(interestWithExtra).toBeLessThan(interestNoExtra);
      expect(scheduleWithExtra.length).toBeLessThan(scheduleNoExtra.length);
    });

    it("handles 0% interest loan", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "PERSONAL",
        name: "Zero Interest",
        principal: 12000,
        aprPct: 0,
        termMonths: 12,
        startDate: "2024-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

      expect(schedule.length).toBe(12);
      expect(schedule.every(row => row.interest === 0)).toBe(true);
      expect(getTotalPaymentsMade(schedule)).toBeCloseTo(12000, 2);
    });

    it("handles payment override", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 10000,
        aprPct: 6,
        termMonths: 24,
        startDate: "2024-01-01",
        paymentOverrideMonthly: 500,
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2025-12-31");

      expect(schedule[0].payment).toBeCloseTo(500, 2);
    });

    it("handles loan starting before projection", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 10000,
        aprPct: 6,
        termMonths: 24,
        startDate: "2023-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

      // Should have 12 months remaining
      expect(schedule.length).toBe(12);
      expect(schedule[0].balance).toBeLessThan(10000); // Principal paid down
    });
  });

  describe("getLoanBalanceAtDate", () => {
    const loan: LoanDTO = {
      id: "loan1",
      type: "AUTO",
      name: "Car Loan",
      principal: 10000,
      aprPct: 6,
      termMonths: 12,
      startDate: "2024-01-01",
    };

    const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

    it("returns correct balance for date in schedule", () => {
      const balance = getLoanBalanceAtDate(schedule, "2024-06-01");
      expect(balance).toBeGreaterThan(0);
      expect(balance).toBeLessThan(10000);
    });

    it("returns 0 for date after loan paid off", () => {
      const balance = getLoanBalanceAtDate(schedule, "2025-06-01");
      expect(balance).toBe(0);
    });

    it("returns balance for date before schedule", () => {
      const balance = getLoanBalanceAtDate(schedule, "2023-12-01");
      expect(balance).toBeGreaterThan(0);
    });

    it("returns 0 for empty schedule", () => {
      expect(getLoanBalanceAtDate([], "2024-06-01")).toBe(0);
    });
  });

  describe("getMonthlyPaymentAtDate", () => {
    const loan: LoanDTO = {
      id: "loan1",
      type: "AUTO",
      name: "Car Loan",
      principal: 10000,
      aprPct: 6,
      termMonths: 12,
      startDate: "2024-01-01",
    };

    const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

    it("returns payment for date in schedule", () => {
      const payment = getMonthlyPaymentAtDate(schedule, "2024-06-01");
      expect(payment).toBeGreaterThan(0);
    });

    it("returns 0 for date outside schedule", () => {
      expect(getMonthlyPaymentAtDate(schedule, "2025-06-01")).toBe(0);
    });
  });

  describe("financial invariants", () => {
    it("balance decreases monotonically", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "AUTO",
        name: "Car Loan",
        principal: 15000,
        aprPct: 5,
        termMonths: 36,
        startDate: "2024-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2026-12-31");

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance);
      }
    });

    it("payment equals principal plus interest", () => {
      const loan: LoanDTO = {
        id: "loan1",
        type: "PERSONAL",
        name: "Personal Loan",
        principal: 5000,
        aprPct: 8,
        termMonths: 12,
        startDate: "2024-01-01",
      };

      const schedule = generateAmortizationSchedule(loan, "2024-01-01", "2024-12-31");

      for (const row of schedule) {
        const sum = row.principal + row.interest;
        expect(sum).toBeCloseTo(row.payment, 2);
      }
    });
  });
});
