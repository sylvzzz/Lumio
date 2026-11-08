provider "google" {
  project     = "lumio-514119"
  credentials = file("credentials.json")
  region      = "europe-southwest1"
  zone        = "europe-southwest1-a"
}

resource "google_compute_instance" "lumio" {
  name         = "lumio-server"
  machine_type = "e2-highcpu-2"
  zone         = "europe-southwest1-a"

  allow_stopping_for_update = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"

    access_config {
        // necessary even empty
    }
  }
}