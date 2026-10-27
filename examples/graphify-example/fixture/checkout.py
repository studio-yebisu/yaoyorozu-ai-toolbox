from shipping import shipping_fee

def checkout_total(subtotal_yen):
    return subtotal_yen + shipping_fee(subtotal_yen)
