# Cloudflare DNS for the resonect.cz zone.
#
# - aiolos.resonect.cz: proxied (orange cloud) HTTPS frontend. No device uses
#   this hostname, so Cloudflare "Always Use HTTPS" may be ON for it.
# - api.aiolos.resonect.cz: DNS-only (grey cloud) alias straight to the box EIP,
#   for humans/tooling. Stations do NOT use it — the firmware posts to the raw
#   reserved IP because the cellular modem's DNS is unreliable.
#
# If a record already exists in Cloudflare, import it before the first apply:
#   terraform import cloudflare_dns_record.aiolos <zone_id>/<record_id>

resource "cloudflare_dns_record" "aiolos" {
  zone_id = aws_ssm_parameter.cloudflare_zone_id.value
  name    = "aiolos.resonect.cz"
  type    = "A"
  content = aws_eip.aiolos_prod.public_ip
  proxied = true
  ttl     = 1
  comment = "Aiolos weather station frontend (prod) - managed by Terraform"
}

resource "cloudflare_dns_record" "api" {
  zone_id = aws_ssm_parameter.cloudflare_zone_id.value
  name    = "api.aiolos.resonect.cz"
  type    = "A"
  content = aws_eip.aiolos_prod.public_ip
  proxied = false # DNS-only: resolves straight to the origin EIP, plain HTTP :80
  ttl     = 300
  comment = "Aiolos ingest alias (prod) - managed by Terraform"
}
