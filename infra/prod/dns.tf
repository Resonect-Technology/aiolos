# aiolos.resonect.cz — Cloudflare-proxied A record pointing at the box.
#
# The record already exists in Cloudflare (it serves production today).
# At cutover, IMPORT it before the apply that flips the origin:
#   terraform import cloudflare_dns_record.aiolos <zone_id>/<record_id>
#
# proxied = true is load-bearing: deployed ESP32 stations POST plain HTTP to
# aiolos.resonect.cz:80 through the Cloudflare edge, so flipping the origin
# EIP is invisible to them. "Always Use HTTPS" must stay OFF for this zone.

resource "cloudflare_dns_record" "aiolos" {
  zone_id = aws_ssm_parameter.cloudflare_resonect_zone_id.value
  name    = "aiolos.resonect.cz"
  type    = "A"
  content = aws_eip.aiolos_prod.public_ip
  proxied = true
  ttl     = 1
  comment = "Aiolos weather station (prod) - managed by Terraform"
}
