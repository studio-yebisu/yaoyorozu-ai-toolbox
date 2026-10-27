FREE_SHIPPING_YEN = 4000
STANDARD_SHIPPING_YEN = 650

def shipping_fee(subtotal_yen):
    if subtotal_yen < 0:
        raise ValueError("subtotal must be nonnegative")
    return 0 if subtotal_yen >= FREE_SHIPPING_YEN else STANDARD_SHIPPING_YEN
