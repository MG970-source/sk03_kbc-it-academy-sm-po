package api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * UNIT TESTS — the JSON handling the API does by hand.
 *
 * These call the helper methods directly. No server is started and no request
 * is sent, which is exactly what separates a unit test from the integration
 * tests in BankingApiIT.
 */
@DisplayName("Banking API JSON helpers")
class BankingApiJsonTest {

    @Test
    @DisplayName("An account is written out with its fields in the order they were added")
    void accountIsSerialisedInFieldOrder() {
        Map<String, String> account = BankingApi.account("7", "Ivan Petrov", "310.00");

        assertEquals(
            "{\"id\": \"7\", \"owner\": \"Ivan Petrov\", \"balance\": \"310.00\"}",
            BankingApi.toJson(account));
    }

    @Test
    @DisplayName("A list of accounts is written out as a JSON array")
    void accountListIsSerialisedAsAnArray() {
        String json = BankingApi.toJsonArray(List.of(
            BankingApi.account("1", "Jan Janssen", "1200.00"),
            BankingApi.account("2", "Marie Dupont", "850.50")));

        assertEquals(
            "[{\"id\": \"1\", \"owner\": \"Jan Janssen\", \"balance\": \"1200.00\"}, "
          + "{\"id\": \"2\", \"owner\": \"Marie Dupont\", \"balance\": \"850.50\"}]",
            json);
    }

    @Test
    @DisplayName("A posted account body is read back into fields")
    void flatJsonBodyIsParsed() {
        Map<String, String> parsed = BankingApi.parseJson(
            "{\"id\": \"3\", \"owner\": \"Alice\", \"balance\": \"500\"}");

        assertEquals("3", parsed.get("id"));
        assertEquals("Alice", parsed.get("owner"));
        assertEquals("500", parsed.get("balance"));
    }

    @Test
    @DisplayName("KNOWN DEFECT: a comma inside a value silently truncates it")
    void aCommaInsideAValueBreaksTheParser() {
        // A customer whose name is filed the way a bank files it: surname first.
        Map<String, String> parsed = BankingApi.parseJson(
            "{\"id\": \"4\", \"owner\": \"Dupont, Marie\", \"balance\": \"850.50\"}");

        // This is not the behaviour anyone wants. It is the behaviour the code has:
        // the parser splits on every comma, so the name is cut in half and the half
        // it throws away is never mentioned again.
        assertEquals("Dupont", parsed.get("owner"), "everything after the comma is dropped");
        assertFalse(parsed.toString().contains("Marie"), "the given name disappears without a word");

        // Note what does not happen: no exception, no 400, no log line. The account
        // is created under the wrong name and the balance is filed correctly next to
        // it, which is the version of this bug that reaches a customer.
        assertEquals("850.50", parsed.get("balance"));

        // A test that pins wrong behaviour is called a characterisation test. It is
        // green, and the software is still wrong — which is the whole argument
        // against reading a green pipeline as "the product works". The defect is
        // written up as UAT-09 in UAT.MD; fixing it should turn this test red, and
        // whoever fixes it is expected to rewrite it.
    }
}
