// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PrimeKidsChild",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "PrimeKidsChild", targets: ["PrimeKidsChild"]),
    ],
    targets: [
        .target(
            name: "PrimeKidsChild",
            path: "PrimeKidsChild"
        ),
    ]
)
