variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t4g.nano"
}

variable "key_name" {
  description = "SSH key pair name for access. Set via TF_VAR_key_name in your .env file."
  type        = string
}
