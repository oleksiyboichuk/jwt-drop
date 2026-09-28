variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "aws_profile" {
  type    = string
  default = "default"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "jwt-drop"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-central-1a", "eu-central-1b"]
}

variable "app_service_desired_count" {
  type    = number
  default = 2
}

variable "app_service_cpu" {
  type    = number
  default = 256
}

variable "app_service_memory" {
  type    = number
  default = 512
}

variable "app_service_port" {
  type    = number
  default = 3000
}

variable "dynamodb_table_name" {
  type    = string
  default = "Sessions"
}
