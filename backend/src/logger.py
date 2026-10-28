class FatalError(Exception):
    """Signals an already-logged error that must stop the current command."""


class Logger:
    """Prints a message in a colour; every method is static."""

    @staticmethod
    def error(text: str) -> None:
        """Print *text* in red.

        Args:
            text: Message to print.
        """
        print("\033[31m" + text + "\033[0m")

    @staticmethod
    def success(text: str) -> None:
        """Print *text* in green.

        Args:
            text: Message to print.
        """
        print("\033[92m" + text + "\033[0m")

    @staticmethod
    def warning(text: str) -> None:
        """Print *text* in yellow.

        Args:
            text: Message to print.
        """
        print("\033[33m" + text + "\033[0m")
