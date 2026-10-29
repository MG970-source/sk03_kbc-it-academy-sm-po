package monolith;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * UNIT TESTS — the bottom of the test pyramid.
 *
 * Each test creates one object, calls one method and checks the answer.
 * Nothing is started, nothing is connected to, nothing is left behind.
 * The whole file runs in a few milliseconds, which is why tests like these
 * are the ones a developer can afford to run on every save.
 */
@DisplayName("Monolith banking rules")
class BankingAppTest {

    @Test
    @DisplayName("A loan is repaid in equal monthly instalments")
    void loanPaymentIsTheAmountSplitOverTheTerm() {
        BankingApp app = new BankingApp();

        double monthly = app.calculateLoanPayment(12000, 24);

        assertEquals(500.00, monthly, 0.001, "12 000 over 24 months should be 500 a month");
    }

    @Test
    @DisplayName("An accepted card payment reduces the money still available")
    void acceptedPaymentReducesTheBalance() {
        BankingApp app = new BankingApp();   // opening balance is 2500.00

        assertTrue(app.processCardPayment(2000.00), "2 000 is covered by a 2 500 balance");

        // 500 is left, so this one must not go through. The second call is the
        // real assertion: it is the only way to see, from outside, that the
        // first payment actually moved the balance.
        assertFalse(app.processCardPayment(600.00), "only 500 should be left after the first payment");
    }

    @Test
    @DisplayName("A card payment larger than the balance is declined")
    void paymentOverTheBalanceIsDeclined() {
        BankingApp app = new BankingApp();

        assertFalse(app.processCardPayment(2500.01), "one cent over the balance is still over the balance");

        // Declining must not quietly take the money anyway.
        assertTrue(app.processCardPayment(2500.00), "the full balance should still be there");
    }
}
