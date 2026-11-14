package io.github.maximbelov.applifecycle

import com.getcapacitor.Logger

class AppLifecycle {

    fun echo(value: String): String {
        Logger.info("Echo", value)

        return value
    }
}
