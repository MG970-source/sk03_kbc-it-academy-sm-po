package theatre;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * ⚠️  THIS IS THE ANTI-PATTERN. DO NOT COPY IT.
 *
 * Excluded from the normal build. It exists to be run once, in front of a room:
 *
 *     mvn verify                       →  coverage as it honestly is
 *     mvn verify -Pcoverage-theatre    →  coverage with this file included
 *
 * Compare the two numbers in target/site/jacoco/index.html. The second is far
 * higher. Nothing was tested in between. Every method below is called and
 * nothing is checked afterwards, so the tool records those lines as "covered"
 * while no statement anywhere says what they are supposed to do. Change what
 * CardService charges, or make LoanService divide by the wrong number, and this
 * file still passes.
 *
 * That is the case against coverage as a target. It measures what ran, not what
 * was verified: a useful floor — code at zero is code nobody has executed
 * outside production — and a worthless ceiling.
 */
@DisplayName("Coverage theatre (teaching example — asserts nothing)")
class CoverageTheatreTest {

    @Test
    @DisplayName("Runs every service and asks them nothing")
    void runTheServices() {
        microservices.App.main(new String[0]);
        microservices.CardService.main(new String[0]);
        microservices.LoanService.main(new String[0]);
        microservices.NotificationService.main(new String[0]);
        // No assertion of any kind. Four classes just turned green.
    }
}
